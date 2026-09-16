import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyToken } from "@/lib/auth";
import {
  generateFileHash,
  isValidExternalUrl,
  isValidMimeType,
} from "@/lib/security";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".zip", ".rar", ".7z"];

const FALLBACK_MIMES: Record<string, string> = {
  ".zip": "application/zip",
  ".rar": "application/x-rar-compressed",
  ".7z": "application/x-7z-compressed",
};

// ==================================================
// AUTH
// ==================================================

async function getAuthenticatedUser(req: Request) {
  const cookieHeader = req.headers.get("cookie");

  const sessionCookie = cookieHeader
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("session="));

  const token = sessionCookie?.split("=")[1];

  if (!token) {
    return null;
  }

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

// ==================================================
// HELPERS
// ==================================================

function parseIdArray(formData: FormData, fieldName: string): string[] {
  const rawValue = formData.get(fieldName);

  if (rawValue === null) {
    return [];
  }

  const raw = String(rawValue).trim();

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error(`${fieldName} debe ser un array.`);
    }

    return [
      ...new Set(
        parsed
          .map((value) => String(value).trim())
          .filter((value) => value.length > 0)
      ),
    ];
  } catch {
    throw new Error(`El campo ${fieldName} no tiene un formato válido.`);
  }
}

function getFileExtension(fileName: string): string {
  const lowerFileName = fileName.toLowerCase();

  return lowerFileName.slice(lowerFileName.lastIndexOf("."));
}

// ==================================================
// GET
// ==================================================

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const mod = await prisma.mod.findUnique({
      where: { id },
      include: {
        game: true,
        gameVersion: true,

        categories: {
          include: {
            category: true,
          },
        },

        dependencies: {
          include: {
            dependency: {
              include: {
                game: true,
                gameVersion: true,
              },
            },
          },
        },

        incompatibilities: {
          include: {
            incompatible: {
              include: {
                game: true,
                gameVersion: true,
              },
            },
          },
        },
      },
    });

    if (!mod) {
      return NextResponse.json(
        { error: "El mod no existe." },
        { status: 404 }
      );
    }

    const canEdit =
      user.role === "ADMIN" || mod.authorId === user.userId;

    if (mod.status !== "APPROVED" && !canEdit) {
      return NextResponse.json(
        { error: "No tienes permiso para acceder a este mod." },
        { status: 403 }
      );
    }

    return NextResponse.json(mod);
  } catch (error) {
    console.error("Error al obtener mod:", error);

    return NextResponse.json(
      { error: "No se pudo obtener el mod." },
      { status: 500 }
    );
  }
}

// ==================================================
// PUT - EDITAR MOD
// ==================================================

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  let uploadedStorageKey: string | null = null;

  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para editar el mod." },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    // --------------------------------------------------
    // Buscar mod existente
    // --------------------------------------------------

    const existingMod = await prisma.mod.findUnique({
      where: { id },
      include: {
        categories: true,
        dependencies: true,
        incompatibilities: true,
      },
    });

    if (!existingMod) {
      return NextResponse.json(
        { error: "El mod no existe." },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // Permisos
    // --------------------------------------------------

    if (
      user.role !== "ADMIN" &&
      existingMod.authorId !== user.userId
    ) {
      return NextResponse.json(
        { error: "No tienes permiso para editar este mod." },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // Leer FormData
    // --------------------------------------------------

    const formData = await req.formData();

    const name = String(formData.get("name") ?? "").trim();
    const version = String(formData.get("version") ?? "").trim();
    const license = String(formData.get("license") ?? "").trim();

    const externalUrl = String(
      formData.get("externalUrl") ?? ""
    ).trim();

    const gameId = String(
      formData.get("gameId") ?? ""
    ).trim();

    const gameVersionId = String(
      formData.get("gameVersionId") ?? ""
    ).trim();

    // --------------------------------------------------
    // Validaciones básicas
    // --------------------------------------------------

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del mod es obligatorio." },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        { error: "La versión del mod es obligatoria." },
        { status: 400 }
      );
    }

    if (!gameId) {
      return NextResponse.json(
        { error: "Debes seleccionar un juego." },
        { status: 400 }
      );
    }

    if (!gameVersionId) {
      return NextResponse.json(
        { error: "Debes seleccionar una versión del juego." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Relaciones
    // --------------------------------------------------

    let categoryIds: string[];
    let dependencyIds: string[];
    let incompatibilityIds: string[];

    try {
      categoryIds = parseIdArray(formData, "categoryIds");
      dependencyIds = parseIdArray(
        formData,
        "dependencyIds"
      );
      incompatibilityIds = parseIdArray(
        formData,
        "incompatibilityIds"
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Las relaciones del mod no son válidas.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Evitar dependencia e incompatibilidad simultánea
    // --------------------------------------------------

    const dependencySet = new Set(dependencyIds);

    const conflictingRelations =
      incompatibilityIds.filter((id) =>
        dependencySet.has(id)
      );

    if (conflictingRelations.length > 0) {
      return NextResponse.json(
        {
          error:
            "Un mismo mod no puede estar definido como dependencia e incompatibilidad.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Un mod no puede depender de sí mismo
    // --------------------------------------------------

    if (
      dependencyIds.includes(id) ||
      incompatibilityIds.includes(id)
    ) {
      return NextResponse.json(
        {
          error:
            "Un mod no puede depender de sí mismo ni ser incompatible consigo mismo.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Verificar juego
    // --------------------------------------------------

    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        deletedAt: null,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "El juego seleccionado no existe." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Verificar versión del juego
    // --------------------------------------------------

    const gameVersion = await prisma.gameVersion.findFirst({
      where: {
        id: gameVersionId,
        gameId,
      },
    });

    if (!gameVersion) {
      return NextResponse.json(
        {
          error:
            "La versión seleccionada no pertenece al juego.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Verificar categorías
    // --------------------------------------------------

    if (categoryIds.length > 0) {
      const categories = await prisma.category.findMany({
        where: {
          id: {
            in: categoryIds,
          },
        },
        select: {
          id: true,
        },
      });

      const validCategoryIds = new Set(
        categories.map((category) => category.id)
      );

      const invalidCategory = categoryIds.find(
        (categoryId) => !validCategoryIds.has(categoryId)
      );

      if (invalidCategory) {
        return NextResponse.json(
          {
            error:
              "Una o más categorías seleccionadas no existen.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------
    // Verificar dependencias
    // --------------------------------------------------

    if (dependencyIds.length > 0) {
      const dependencies = await prisma.mod.findMany({
        where: {
          id: {
            in: dependencyIds,
          },
          status: "APPROVED",
          deletedAt: null,
          gameId,
          gameVersionId,
        },
        select: {
          id: true,
        },
      });

      const validDependencyIds = new Set(
        dependencies.map((dependency) => dependency.id)
      );

      const invalidDependency = dependencyIds.find(
        (dependencyId) =>
          !validDependencyIds.has(dependencyId)
      );

      if (invalidDependency) {
        return NextResponse.json(
          {
            error:
              "Una o más dependencias no son válidas para este juego y versión.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------
    // Verificar incompatibilidades
    // --------------------------------------------------

    if (incompatibilityIds.length > 0) {
      const incompatibilities = await prisma.mod.findMany({
        where: {
          id: {
            in: incompatibilityIds,
          },
          status: "APPROVED",
          deletedAt: null,
          gameId,
          gameVersionId,
        },
        select: {
          id: true,
        },
      });

      const validIncompatibilityIds = new Set(
        incompatibilities.map(
          (incompatibility) => incompatibility.id
        )
      );

      const invalidIncompatibility =
        incompatibilityIds.find(
          (incompatibilityId) =>
            !validIncompatibilityIds.has(
              incompatibilityId
            )
        );

      if (invalidIncompatibility) {
        return NextResponse.json(
          {
            error:
              "Una o más incompatibilidades no son válidas para este juego y versión.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------
    // Archivo
    // --------------------------------------------------

    const fileValue = formData.get("file");

    const hasNewFile =
      fileValue instanceof File && fileValue.size > 0;

    let newFileData: {
      fileName: string;
      fileSize: number;
      mimeType: string;
      fileHash: string;
      storageKey: string;
      fileUrl: null;
    } | null = null;

    // --------------------------------------------------
    // Si se subió un nuevo archivo
    // --------------------------------------------------

    if (hasNewFile && fileValue instanceof File) {
      // Límite de tamaño
      if (fileValue.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error:
              "El archivo no puede superar los 50 MB.",
          },
          { status: 400 }
        );
      }

      const extension = getFileExtension(
        fileValue.name
      );

      // Extensión permitida
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return NextResponse.json(
          {
            error:
              "Tipo de archivo no permitido. Solo se aceptan archivos ZIP, RAR y 7Z.",
          },
          { status: 400 }
        );
      }

      // MIME
      const mimeType =
        fileValue.type || FALLBACK_MIMES[extension] || "";

      if (
        !isValidMimeType(
          mimeType,
          fileValue.name
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El tipo de archivo no es válido.",
          },
          { status: 400 }
        );
      }

      // Leer archivo
      const arrayBuffer = await fileValue.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Hash
      const fileHash = generateFileHash(buffer);

      // Storage key
      const storageKey =
        `${crypto.randomUUID()}${extension}`;

      uploadedStorageKey = storageKey;

      // Subir a Supabase
      const { error: uploadError } =
        await supabaseAdmin.storage
          .from("mods")
          .upload(storageKey, buffer, {
            contentType: mimeType,
            upsert: false,
          });

      if (uploadError) {
        console.error(
          "Error al subir archivo a Supabase:",
          uploadError
        );

        return NextResponse.json(
          {
            error:
              "No se pudo subir el archivo.",
          },
          { status: 500 }
        );
      }

      newFileData = {
        fileName: fileValue.name,
        fileSize: fileValue.size,
        mimeType,
        fileHash,
        storageKey,
        fileUrl: null,
      };
    }

    // --------------------------------------------------
    // Validación de fuente externa
    // --------------------------------------------------

    const isExistingHostedMod =
      Boolean(existingMod.storageKey);

    const isExistingExternalMod =
      Boolean(existingMod.externalUrl);

    if (!hasNewFile && !isExistingHostedMod) {
      if (!externalUrl) {
        return NextResponse.json(
          {
            error:
              "Debes proporcionar una URL externa o subir un archivo.",
          },
          { status: 400 }
        );
      }

      if (!isValidExternalUrl(externalUrl)) {
        return NextResponse.json(
          {
            error:
              "La URL externa no pertenece a una fuente permitida.",
          },
          { status: 400 }
        );
      }
    }

    // Si se proporciona una URL externa, validarla.
    if (externalUrl) {
      if (!isValidExternalUrl(externalUrl)) {
        return NextResponse.json(
          {
            error:
              "La URL externa no pertenece a una fuente permitida.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------
    // Determinar origen final
    // --------------------------------------------------

    let finalExternalUrl: string | null;
    let finalFileData = newFileData;

    if (hasNewFile) {
      // Nuevo archivo => deja de ser externo
      finalExternalUrl = null;
    } else if (isExistingHostedMod) {
      // No se cambió el archivo => conservar archivo actual
      finalExternalUrl = null;
    } else if (isExistingExternalMod) {
      // Mod externo => conservar/actualizar URL
      finalExternalUrl = externalUrl || existingMod.externalUrl;
    } else {
      finalExternalUrl = externalUrl || null;
    }

    // --------------------------------------------------
    // Actualizar base de datos
    // --------------------------------------------------

    const oldStorageKey = existingMod.storageKey;

    try {
      const mod = await prisma.$transaction(async (tx) => {
        const updatedMod = await tx.mod.update({
          where: { id },

          data: {
            name,
            version,
            license: license || null,

            externalUrl: finalExternalUrl,

            gameId,
            gameVersionId,

            // Al editar, vuelve a revisión.
            status: "PENDING",

            // ------------------------------------------
            // Archivo
            // ------------------------------------------

            ...(finalFileData
              ? {
                  fileName: finalFileData.fileName,
                  fileSize: finalFileData.fileSize,
                  mimeType: finalFileData.mimeType,
                  fileHash: finalFileData.fileHash,
                  storageKey: finalFileData.storageKey,
                  fileUrl: null,
                }
              : {}),

            // ------------------------------------------
            // Categorías
            // ------------------------------------------

            categories: {
              deleteMany: {},

              create: categoryIds.map((categoryId) => ({
                category: {
                  connect: {
                    id: categoryId,
                  },
                },
              })),
            },

            // ------------------------------------------
            // Dependencias
            // ------------------------------------------

            dependencies: {
              deleteMany: {},

              create: dependencyIds.map(
                (dependencyId) => ({
                  dependency: {
                    connect: {
                      id: dependencyId,
                    },
                  },
                })
              ),
            },

            // ------------------------------------------
            // Incompatibilidades
            // ------------------------------------------

            incompatibilities: {
              deleteMany: {},

              create: incompatibilityIds.map(
                (incompatibleId) => ({
                  incompatible: {
                    connect: {
                      id: incompatibleId,
                    },
                  },
                })
              ),
            },
          },

          include: {
            game: true,
            gameVersion: true,

            categories: {
              include: {
                category: true,
              },
            },

            dependencies: {
              include: {
                dependency: true,
              },
            },

            incompatibilities: {
              include: {
                incompatible: true,
              },
            },
          },
        });

        return updatedMod;
      });

      // --------------------------------------------------
      // Eliminar archivo anterior
      // --------------------------------------------------

      if (
        hasNewFile &&
        oldStorageKey &&
        oldStorageKey !== uploadedStorageKey
      ) {
        const { error: removeError } =
          await supabaseAdmin.storage
            .from("mods")
            .remove([oldStorageKey]);

        if (removeError) {
          console.error(
            "No se pudo eliminar el archivo anterior de Supabase:",
            removeError
          );
        }
      }

      return NextResponse.json({
        message:
          "El mod fue actualizado y enviado nuevamente a revisión.",
        mod,
      });
    } catch (databaseError) {
      // -----------------------------------------------
      // Si falló la BD, borrar el nuevo archivo
      // -----------------------------------------------

      if (uploadedStorageKey) {
        const { error: cleanupError } =
          await supabaseAdmin.storage
            .from("mods")
            .remove([uploadedStorageKey]);

        if (cleanupError) {
          console.error(
            "No se pudo limpiar el archivo subido:",
            cleanupError
          );
        }
      }

      throw databaseError;
    }
  } catch (error) {
    console.error("Error al editar mod:", error);

    return NextResponse.json(
      { error: "No se pudo editar el mod." },
      { status: 500 }
    );
  }
}

// ==================================================
// DELETE
// ==================================================

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Debes iniciar sesión para eliminar el mod.",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const mod = await prisma.mod.findUnique({
      where: { id },
    });

    if (!mod) {
      return NextResponse.json(
        { error: "Mod no encontrado." },
        { status: 404 }
      );
    }

    if (
      user.role !== "ADMIN" &&
      mod.authorId !== user.userId
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permiso para eliminar este mod.",
        },
        { status: 403 }
      );
    }

    await prisma.mod.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({
      message:
        "Mod enviado a la papelera correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar mod:", error);

    return NextResponse.json(
      { error: "Error al eliminar el mod." },
      { status: 500 }
    );
  }
}

// ==================================================
// PATCH - RESTAURAR
// ==================================================

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Debes iniciar sesión para restaurar el mod.",
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    const existingMod = await prisma.mod.findUnique({
      where: { id },
    });

    if (!existingMod) {
      return NextResponse.json(
        { error: "El mod no existe." },
        { status: 404 }
      );
    }

    if (!existingMod.deletedAt) {
      return NextResponse.json(
        {
          error:
            "Este mod no está en la papelera.",
        },
        { status: 400 }
      );
    }

    if (
      user.role !== "ADMIN" &&
      existingMod.authorId !== user.userId
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permiso para restaurar este mod.",
        },
        { status: 403 }
      );
    }

    const restoredMod = await prisma.mod.update({
      where: { id },

      data: {
        deletedAt: null,

        ...(existingMod.status !== "REJECTED" && {
          status: "PENDING",
        }),
      },
    });

    return NextResponse.json({
      message: "Mod restaurado correctamente.",
      mod: restoredMod,
    });
  } catch (error) {
    console.error("Error al restaurar mod:", error);

    return NextResponse.json(
      { error: "No se pudo restaurar el mod." },
      { status: 500 }
    );
  }
}