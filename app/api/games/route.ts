import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        mods: {
          where: {
            status: "APPROVED",
            deletedAt: null,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("Error al obtener los juegos:", error);

    return NextResponse.json(
      {
        error: "No se pudieron obtener los juegos",
      },
      {
        status: 500,
      }
    );
  }
}