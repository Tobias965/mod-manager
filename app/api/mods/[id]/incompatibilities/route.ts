import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

// ==================================================
// AUTENTICACIÓN
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
// GET - LISTAR INCOMPATIBILIDADES
// ==================================================

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        {
          error: "Debes iniciar sesión.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await context.params;

    const mod = await prisma.mod.findUnique({
      where: {
        id,
      },
      include: {
        incompatibilities: {
          include: {
            incompatible: {
              include: {
                game: true,
                gameVersion: true,
                categories: {
                  include: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!mod) {
      return NextResponse.json(
        {
          error: "El mod no existe.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(
      mod.incompatibilities.map(
        (relation) => relation.incompatible
      )
    );
  } catch (error) {
    console.error(
      "Error al obtener incompatibilidades:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudieron obtener las incompatibilidades.",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// POST - AÑADIR INCOMPATIBILIDAD
// ==================================================

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        {
          error: "Debes iniciar sesión.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await context.params;

    const body = await req.json();

    const incompatibleId = String(
      body.incompatibleId ?? ""
    ).trim();

    if (!incompatibleId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar un mod incompatible.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // MOD PRINCIPAL
    // --------------------------------------------------

    const mod = await prisma.mod.findUnique({
      where: {
        id,
      },
    });

    if (!mod) {
      return NextResponse.json(
        {
          error: "El mod no existe.",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // PERMISOS
    // --------------------------------------------------

    if (
      user.role !== "ADMIN" &&
      mod.authorId !== user.userId
    ) {
      return NextResponse.json(
        {
          error: "No tienes permiso para modificar este mod.",
        },
        {
          status: 403,
        }
      );
    }

    // --------------------------------------------------
    // EVITAR SÍ MISMO
    // --------------------------------------------------

    if (id === incompatibleId) {
      return NextResponse.json(
        {
          error:
            "Un mod no puede ser incompatible consigo mismo.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // MOD INCOMPATIBLE
    // --------------------------------------------------

    const incompatible = await prisma.mod.findUnique({
      where: {
        id: incompatibleId,
      },
    });

    if (!incompatible) {
      return NextResponse.json(
        {
          error: "El mod seleccionado no existe.",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // SOLO MODS APROBADOS
    // --------------------------------------------------

    if (incompatible.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Solo se pueden seleccionar mods aprobados como incompatibles.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // MISMO JUEGO
    // --------------------------------------------------

    if (incompatible.gameId !== mod.gameId) {
      return NextResponse.json(
        {
          error:
            "El mod incompatible debe pertenecer al mismo juego.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // MISMA VERSIÓN
    // --------------------------------------------------

    if (
      incompatible.gameVersionId !==
      mod.gameVersionId
    ) {
      return NextResponse.json(
        {
          error:
            "El mod incompatible debe corresponder a la misma versión del juego.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // COMPROBAR DUPLICADO
    // --------------------------------------------------

    const existing =
      await prisma.modIncompatibility.findUnique({
        where: {
          modId_incompatibleId: {
            modId: id,
            incompatibleId,
          },
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Esta incompatibilidad ya está añadida.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------
    // CREAR RELACIÓN
    // --------------------------------------------------

    const relation =
      await prisma.modIncompatibility.create({
        data: {
          modId: id,
          incompatibleId,
        },
        include: {
          incompatible: {
            include: {
              game: true,
              gameVersion: true,
            },
          },
        },
      });

    return NextResponse.json(
      {
        message:
          "Incompatibilidad añadida correctamente.",
        incompatible: relation.incompatible,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error al añadir incompatibilidad:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo añadir la incompatibilidad.",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// DELETE - ELIMINAR INCOMPATIBILIDAD
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
          error: "Debes iniciar sesión.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await context.params;

    const url = new URL(req.url);

    const incompatibleId =
      url.searchParams.get("incompatibleId");

    if (!incompatibleId) {
      return NextResponse.json(
        {
          error:
            "Debes indicar la incompatibilidad que quieres eliminar.",
        },
        {
          status: 400,
        }
      );
    }

    const mod = await prisma.mod.findUnique({
      where: {
        id,
      },
    });

    if (!mod) {
      return NextResponse.json(
        {
          error: "El mod no existe.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      user.role !== "ADMIN" &&
      mod.authorId !== user.userId
    ) {
      return NextResponse.json(
        {
          error: "No tienes permiso para modificar este mod.",
        },
        {
          status: 403,
        }
      );
    }

    const relation =
      await prisma.modIncompatibility.findUnique({
        where: {
          modId_incompatibleId: {
            modId: id,
            incompatibleId,
          },
        },
      });

    if (!relation) {
      return NextResponse.json(
        {
          error: "La incompatibilidad no existe.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.modIncompatibility.delete({
      where: {
        modId_incompatibleId: {
          modId: id,
          incompatibleId,
        },
      },
    });

    return NextResponse.json({
      message:
        "Incompatibilidad eliminada correctamente.",
    });
  } catch (error) {
    console.error(
      "Error al eliminar incompatibilidad:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo eliminar la incompatibilidad.",
      },
      {
        status: 500,
      }
    );
  }
}