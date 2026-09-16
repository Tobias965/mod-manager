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

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const showTrash = searchParams.get("trash") === "true";

    const mods = await prisma.mod.findMany({
      where: {
        authorId: user.userId,
        deletedAt: showTrash ? { not: null } : null,
      },
      include: {
        game: true,
        gameVersion: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ mods });
  } catch (error) {
    console.error("Error al obtener listado de mods:", error);

    return NextResponse.json(
      { error: "No se pudieron obtener los mods." },
      { status: 500 }
    );
  }
}