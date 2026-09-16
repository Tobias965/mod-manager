import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

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
// GET - LISTAR JUEGOS
// ==================================================

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 403,
        }
      );
    }

    const games = await prisma.game.findMany({
      where: {
        deletedAt: null,
      },

      include: {
        versions: {
          orderBy: {
            version: "asc",
          },
        },
      },

      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("Error al obtener juegos:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener los juegos.",
      },
      {
        status: 500,
      }
    );
  }
}

// ==================================================
// POST - CREAR JUEGO
// ==================================================

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const version = String(body.version ?? "").trim();

    if (!name) {
      return NextResponse.json(
        {
          error: "El nombre del juego es obligatorio.",
        },
        {
          status: 400,
        }
      );
    }

    if (!version) {
      return NextResponse.json(
        {
          error: "La versión del juego es obligatoria.",
        },
        {
          status: 400,
        }
      );
    }

    // Buscar el juego independientemente de si está eliminado
    const existingGame = await prisma.game.findFirst({
      where: {
        name,
      },
      include: {
        versions: true,
      },
    });

    // ==================================================
    // JUEGO EXISTENTE
    // ==================================================

    if (existingGame) {
      // --------------------------------------------------
      // El juego ya está activo
      // --------------------------------------------------

      if (existingGame.deletedAt === null) {
        return NextResponse.json(
          {
            error: "Ya existe un juego con ese nombre.",
          },
          {
            status: 409,
          }
        );
      }

      // --------------------------------------------------
      // El juego estaba eliminado → REACTIVAR
      // --------------------------------------------------

      const existingVersion = existingGame.versions.find(
        (gameVersion) => gameVersion.version === version
      );

      const game = await prisma.game.update({
        where: {
          id: existingGame.id,
        },
        data: {
          deletedAt: null,

          // Si la versión ya existía, no hacemos nada.
          // Si no existía, la creamos.
          ...(existingVersion
            ? {}
            : {
                versions: {
                  create: {
                    version,
                  },
                },
              }),
        },
        include: {
          versions: true,
        },
      });

      return NextResponse.json(game, {
        status: 200,
      });
    }

    // ==================================================
    // JUEGO NUEVO
    // ==================================================

    const game = await prisma.game.create({
      data: {
        name,

        versions: {
          create: {
            version,
          },
        },
      },

      include: {
        versions: true,
      },
    });

    return NextResponse.json(game, {
      status: 201,
    });
  } catch (error) {
    console.error("Error al crear juego:", error);

    return NextResponse.json(
      {
        error: "No se pudo crear el juego.",
      },
      {
        status: 500,
      }
    );
  }
}