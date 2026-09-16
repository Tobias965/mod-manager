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
    .find((cookie) =>
      cookie.startsWith("session=")
    );

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
// DELETE - BORRADO LÓGICO
// ==================================================

export async function DELETE(
  req: Request,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const user =
      await getAuthenticatedUser(req);

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

    const { id } = await context.params;

    const game = await prisma.game.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!game) {
      return NextResponse.json(
        {
          error:
            "El juego no existe o ya fue eliminado.",
        },
        {
          status: 404,
        }
      );
    }

    const deletedGame =
      await prisma.game.update({
        where: {
          id,
        },

        data: {
          deletedAt: new Date(),
        },
      });

    return NextResponse.json({
      message:
        "El juego fue eliminado correctamente.",
      game: deletedGame,
    });
  } catch (error) {
    console.error(
      "Error al eliminar juego:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo eliminar el juego.",
      },
      {
        status: 500,
      }
    );
  }
}