import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import {
  generateFileHash,
  isValidExternalUrl,
  isValidMimeType,
} from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".zip",
  ".rar",
  ".7z",
];

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

function parseIdArray(
  formData: FormData,
  fieldName: string
): string[] {
  const values = formData.getAll(fieldName);

  if (values.length === 0) {
    return [];
  }

  // El frontend actual manda JSON.stringify(array)
  if (values.length === 1) {
    const value = String(values[0]).trim();

    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return [
          ...new Set(
            parsed
              .map((id) => String(id).trim())
              .filter(Boolean)
          ),
        ];
      }
    } catch {
      // Si no es JSON, se trata como un ID individual.
    }
  }

  return [
    ...new Set(
      values
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];
}

function getFileExtension(fileName: string): string {
  const lowerFileName = fileName.toLowerCase();

  return lowerFileName.slice(
    lowerFileName.lastIndexOf(".")
  );
}

// ==================================================
// GET
// ==================================================

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);

    const games = await prisma.game.findMany({
      where: {
        deletedAt: null,
      },

      include: {
        versions: true,
      },

      orderBy: {
        name: "asc",
      },
    });

    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    });

    const mods = await prisma.mod.findMany({
      where: {
        status: "APPROVED",
        deletedAt: null,
      },

      select: {
        id: true,
        name: true,
        version: true,
        gameId: true,
        gameVersionId: true,
      },

      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      user: user
        ? {
            id: user.userId,
            role: user.role,
          }
        : null,

      games,
      categories,
      mods,
    });
  } catch (error) {
    console.error(
      "Error al obtener datos de mods:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudieron obtener los datos necesarios.",
      },
      { status: 500 }
    );
  }
}

// ==================================================
// POST - CREAR MOD
// ==================================================

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Debes iniciar sesión para publicar un mod.",
        },
        { status: 401 }
      );
    }

    if (
      user.role !== "CREATOR" &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para publicar mods.",
        },
        { status: 403 }
      );
    }

    const formData = await req.formData();

    const name = String(
      formData.get("name") ?? ""
    ).trim();

    const version = String(
      formData.get("version") ?? ""
    ).trim();

    const license = String(
      formData.get("license") ?? ""
    ).trim();

    const externalUrl = String(
      formData.get("externalUrl") ?? ""
    ).trim();

    const gameId = String(
      formData.get("gameId") ?? ""
    ).trim();

    const gameVersionId = String(
      formData.get("gameVersionId") ?? ""
    ).trim();

    const categoryIds = parseIdArray(
      formData,
      "categoryIds"
    );

    const dependencyIds = parseIdArray(
      formData,
      "dependencyIds"
    );

    const incompatibilityIds = parseIdArray(
      formData,
      "incompatibilityIds"
    );

    // --------------------------------------------------
    // Validaciones
    // --------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          error:
            "El nombre del mod es obligatorio.",
        },
        { status: 400 }
      );
    }

    if (!version) {
      return NextResponse.json(
        {
          error:
            "La versión del mod es obligatoria.",
        },
        { status: 400 }
      );
    }

    if (!gameId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar un juego.",
        },
        { status: 400 }
      );
    }

    if (!gameVersionId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar una versión del juego.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Relaciones excluyentes
    // --------------------------------------------------

    const dependencySet = new Set(dependencyIds);

    const duplicatedRelation =
      incompatibilityIds.some((id) =>
        dependencySet.has(id)
      );

    if (duplicatedRelation) {
      return NextResponse.json(
        {
          error:
            "Un mod no puede ser simultáneamente dependencia e incompatibilidad.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Juego
    // --------------------------------------------------

    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        deletedAt: null,
      },
    });

    if (!game) {
      return NextResponse.json(
        {
          error:
            "El juego seleccionado no existe.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Versión
    // --------------------------------------------------

    const gameVersion =
      await prisma.gameVersion.findFirst({
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
    // Categorías
    // --------------------------------------------------

    if (categoryIds.length > 0) {
      const categories =
        await prisma.category.findMany({
          where: {
            id: {
              in: categoryIds,
            },
          },

          select: {
            id: true,
          },
        });

      if (
        categories.length !== categoryIds.length
      ) {
        return NextResponse.json(
          {
            error:
              "Una o más categorías no existen.",
          },
          { status: 400 }
        );
      }
    }

    // --------------------------------------------------
    // Dependencias
    // --------------------------------------------------

    if (dependencyIds.length > 0) {
      const dependencies =
        await prisma.mod.findMany({
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

      if (
        dependencies.length !==
        dependencyIds.length
      ) {
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
    // Incompatibilidades
    // --------------------------------------------------

    if (incompatibilityIds.length > 0) {
      const incompatibilities =
        await prisma.mod.findMany({
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

      if (
        incompatibilities.length !==
        incompatibilityIds.length
      ) {
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

    const hasFile =
      fileValue instanceof File &&
      fileValue.size > 0;

    if (!hasFile && !externalUrl) {
      return NextResponse.json(
        {
          error:
            "Debes subir un archivo o proporcionar una URL externa.",
        },
        { status: 400 }
      );
    }

    if (hasFile && externalUrl) {
      return NextResponse.json(
        {
          error:
            "No puedes utilizar un archivo y una URL externa al mismo tiempo.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Fuente externa
    // --------------------------------------------------

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
    // Datos del archivo
    // --------------------------------------------------

    let fileName: string | null = null;
    let fileSize: number | null = null;
    let mimeType: string | null = null;
    let fileHash: string | null = null;
    let storageKey: string | null = null;

    if (hasFile && fileValue instanceof File) {
      // -----------------------------------------------
      // Tamaño
      // -----------------------------------------------

      if (fileValue.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error:
              "El archivo no puede superar los 50 MB.",
          },
          { status: 400 }
        );
      }

      // -----------------------------------------------
      // Extensión
      // -----------------------------------------------

      const extension = getFileExtension(
        fileValue.name
      );

      if (
        !ALLOWED_EXTENSIONS.includes(extension)
      ) {
        return NextResponse.json(
          {
            error:
              "Tipo de archivo no permitido. Solo se aceptan ZIP, RAR y 7Z.",
          },
          { status: 400 }
        );
      }

      // -----------------------------------------------
      // MIME
      // -----------------------------------------------

      const detectedMime =
        fileValue.type ||
        FALLBACK_MIMES[extension] ||
        "";

      if (
        !isValidMimeType(
          detectedMime,
          fileValue.name
        )
      ) {
        return NextResponse.json(
          {
            error:
              "El tipo MIME del archivo no es válido.",
          },
          { status: 400 }
        );
      }

      // -----------------------------------------------
      // Leer archivo
      // -----------------------------------------------

      const arrayBuffer =
        await fileValue.arrayBuffer();

      const buffer = Buffer.from(arrayBuffer);

      // -----------------------------------------------
      // Hash
      // -----------------------------------------------

      fileHash = generateFileHash(buffer);

      fileName = fileValue.name;
      fileSize = fileValue.size;
      mimeType = detectedMime;

      // -----------------------------------------------
      // Storage
      // -----------------------------------------------

      storageKey =
        `${crypto.randomUUID()}${extension}`;

      const { error: uploadError } =
        await supabaseAdmin.storage
          .from("mods")
          .upload(storageKey, buffer, {
            contentType: detectedMime,
            upsert: false,
          });

      if (uploadError) {
        console.error(
          "Error al subir archivo:",
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
    }

    // --------------------------------------------------
    // Crear mod
    // --------------------------------------------------

    try {
      const mod = await prisma.mod.create({
        data: {
          name,
          version,
          license: license || null,

          externalUrl:
            externalUrl || null,

          fileName,
          fileSize,
          mimeType,
          fileHash,
          storageKey,

          fileUrl: null,

          status: "PENDING",

          game: {
            connect: {
              id: gameId,
            },
          },

          gameVersion: {
            connect: {
              id: gameVersionId,
            },
          },

          author: {
            connect: {
              id: user.userId,
            },
          },

          categories: {
            create: categoryIds.map(
              (categoryId) => ({
                category: {
                  connect: {
                    id: categoryId,
                  },
                },
              })
            ),
          },

          dependencies: {
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

          incompatibilities: {
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

      return NextResponse.json(
        {
          message:
            "Mod publicado correctamente y enviado a revisión.",
          mod,
        },
        { status: 201 }
      );
    } catch (databaseError) {
      // -----------------------------------------------
      // Si falla Prisma, limpiar archivo de Storage
      // -----------------------------------------------

      if (storageKey) {
        const { error: cleanupError } =
          await supabaseAdmin.storage
            .from("mods")
            .remove([storageKey]);

        if (cleanupError) {
          console.error(
            "No se pudo eliminar el archivo después del error:",
            cleanupError
          );
        }
      }

      throw databaseError;
    }
  } catch (error) {
    console.error(
      "Error al crear mod:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo publicar el mod.",
      },
      { status: 500 }
    );
  }
}