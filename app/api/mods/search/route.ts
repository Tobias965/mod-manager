import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

// ==================================================
// AUTENTICACIÓN
// ==================================================

// ==================================================
// GET - BUSCAR MODS APROBADOS
// ==================================================

export async function GET(req: Request) {
  try {
    // --------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------

    const user = await getSessionFromRequest(req);

    if (!user) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    // --------------------------------------------------
    // PARÁMETROS
    // --------------------------------------------------

    const { searchParams } = new URL(req.url);

    const gameId = searchParams.get("gameId")?.trim() || "";
    const gameVersionId =
      searchParams.get("gameVersionId")?.trim() || "";
    const search =
      searchParams.get("search")?.trim() || "";

    // --------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------

    if (!gameId) {
      return NextResponse.json(
        {
          error: "Debes seleccionar un juego.",
        },
        {
          status: 400,
        }
      );
    }

    if (!gameVersionId) {
      return NextResponse.json(
        {
          error: "Debes seleccionar una versión del juego.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // COMPROBAR JUEGO Y VERSIÓN
    // --------------------------------------------------

    const gameVersion =
      await prisma.gameVersion.findFirst({
        where: {
          id: gameVersionId,
          gameId,
          game: {
            deletedAt: null,
          },
        },
        select: {
          id: true,
          version: true,
          game: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!gameVersion) {
      return NextResponse.json(
        {
          error:
            "La versión seleccionada no pertenece al juego indicado o el juego no está disponible.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // BUSCAR MODS
    // --------------------------------------------------

    const mods = await prisma.mod.findMany({
      where: {
        status: "APPROVED",

        gameId,

        gameVersionId,

          deletedAt: null,

        ...(search
          ? {
              name: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
      },

      select: {
        id: true,
        name: true,
        version: true,
      },

      orderBy: {
        name: "asc",
      },

      take: 20,
    });

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    return NextResponse.json({
      game: {
        id: gameVersion.game.id,
        name: gameVersion.game.name,
      },

      gameVersion: {
        id: gameVersion.id,
        version: gameVersion.version,
      },

      mods,
    });
  } catch (error) {
    console.error("Error al buscar mods:", error);

    return NextResponse.json(
      {
        error: "No se pudieron buscar los mods.",
      },
      {
        status: 500,
      }
    );
  }
}