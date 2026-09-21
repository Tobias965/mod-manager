import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

// ==================================================
// AUTENTICACIÓN
// ==================================================

// ==================================================
// GET - LISTAR DEPENDENCIAS
// ==================================================

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(req);

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
        dependencies: {
          include: {
            dependency: {
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
      mod.dependencies.map((relation) => relation.dependency)
    );
  } catch (error) {
    console.error("Error al obtener dependencias:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener las dependencias.",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// POST - AÑADIR DEPENDENCIA
// ==================================================

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(req);

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

    const dependencyId = String(
      body.dependencyId ?? ""
    ).trim();

    if (!dependencyId) {
      return NextResponse.json(
        {
          error: "Debes seleccionar un mod como dependencia.",
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
    // EVITAR DEPENDENCIA DE SÍ MISMO
    // --------------------------------------------------

    if (id === dependencyId) {
      return NextResponse.json(
        {
          error: "Un mod no puede depender de sí mismo.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // MOD DEPENDENCIA
    // --------------------------------------------------

    const dependency = await prisma.mod.findUnique({
      where: {
        id: dependencyId,
      },
    });

    if (!dependency) {
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

    if (dependency.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Solo se pueden seleccionar mods aprobados como dependencias.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // MISMO JUEGO
    // --------------------------------------------------

    if (dependency.gameId !== mod.gameId) {
      return NextResponse.json(
        {
          error:
            "La dependencia debe pertenecer al mismo juego.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // MISMA VERSIÓN DEL JUEGO
    // --------------------------------------------------

    if (
      dependency.gameVersionId !== mod.gameVersionId
    ) {
      return NextResponse.json(
        {
          error:
            "La dependencia debe ser compatible con la misma versión del juego.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // COMPROBAR DUPLICADO
    // --------------------------------------------------

    const existingDependency =
      await prisma.modDependency.findUnique({
        where: {
          modId_dependencyId: {
            modId: id,
            dependencyId,
          },
        },
      });

    if (existingDependency) {
      return NextResponse.json(
        {
          error: "Esta dependencia ya está añadida.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------
    // CREAR RELACIÓN
    // --------------------------------------------------

    const relation = await prisma.modDependency.create({
      data: {
        modId: id,
        dependencyId,
      },
      include: {
        dependency: {
          include: {
            game: true,
            gameVersion: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Dependencia añadida correctamente.",
        dependency: relation.dependency,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error al añadir dependencia:", error);

    return NextResponse.json(
      {
        error: "No se pudo añadir la dependencia.",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// DELETE - ELIMINAR DEPENDENCIA
// ==================================================

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromRequest(req);

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

    const dependencyId =
      url.searchParams.get("dependencyId");

    if (!dependencyId) {
      return NextResponse.json(
        {
          error: "Debes indicar la dependencia que quieres eliminar.",
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
      await prisma.modDependency.findUnique({
        where: {
          modId_dependencyId: {
            modId: id,
            dependencyId,
          },
        },
      });

    if (!relation) {
      return NextResponse.json(
        {
          error: "La dependencia no existe.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.modDependency.delete({
      where: {
        modId_dependencyId: {
          modId: id,
          dependencyId,
        },
      },
    });

    return NextResponse.json({
      message: "Dependencia eliminada correctamente.",
    });
  } catch (error) {
    console.error("Error al eliminar dependencia:", error);

    return NextResponse.json(
      {
        error: "No se pudo eliminar la dependencia.",
      },
      {
        status: 500,
      }
    );
  }
}