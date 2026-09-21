import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getSessionFromRequest(req);

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