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
// POST - AÑADIR VERSIÓN
// ==================================================

export async function POST(
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

    const body = await req.json();

    const version = String(
      body.version ?? ""
    ).trim();

    if (!version) {
      return NextResponse.json(
        {
          error:
            "La versión del juego es obligatoria.",
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // COMPROBAR JUEGO
    // --------------------------------------------------

    const game = await prisma.game.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!game) {
      return NextResponse.json(
        {
          error: "El juego no existe.",
        },
        {
          status: 404,
        }
      );
    }

    // --------------------------------------------------
    // COMPROBAR DUPLICADO
    // --------------------------------------------------

    const existingVersion =
      await prisma.gameVersion.findUnique({
        where: {
          gameId_version: {
            gameId: id,
            version,
          },
        },
      });

    if (existingVersion) {
      return NextResponse.json(
        {
          error:
            "Esta versión ya existe para este juego.",
        },
        {
          status: 409,
        }
      );
    }

    // --------------------------------------------------
    // CREAR VERSIÓN
    // --------------------------------------------------

    const gameVersion =
      await prisma.gameVersion.create({
        data: {
          gameId: id,
          version,
        },
      });

    return NextResponse.json(
      gameVersion,
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Error al crear versión:",
      error
    );

    return NextResponse.json(
      {
        error:
          "No se pudo crear la versión.",
      },
      {
        status: 500,
      }
    );
  }
}