import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    // ==================================================
    // 1. Verificar autenticación
    // ==================================================

    const cookieStore = await cookies();
    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const session = await verifyToken(token);

    // ==================================================
    // 2. Verificar permisos
    // ==================================================

    if (
      session.role !== "CREATOR" &&
      session.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "No tienes permisos para crear modpacks" },
        { status: 403 }
      );
    }

    // ==================================================
    // 3. Obtener datos
    // ==================================================

    const body = await request.json();

    const {
      name,
      description,
      isPublic,
      gameId,
      modIds,
    } = body;

    // ==================================================
    // 4. Validar nombre
    // ==================================================

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();

    if (!cleanName) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // ==================================================
    // 5. Validar juego
    // ==================================================

    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json(
        { error: "El juego es obligatorio" },
        { status: 400 }
      );
    }

    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        deletedAt: null,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: "El juego seleccionado no existe" },
        { status: 400 }
      );
    }

    // ==================================================
    // 6. Validar mods
    // ==================================================

    if (!Array.isArray(modIds)) {
      return NextResponse.json(
        { error: "La lista de mods no es válida" },
        { status: 400 }
      );
    }

    // Eliminar IDs duplicados
    const uniqueModIds = [
      ...new Set(
        modIds.filter(
          (id): id is string => typeof id === "string"
        )
      ),
    ];

    // ==================================================
    // 7. Comprobar que los mods existen y pertenecen
    //    al juego seleccionado
    // ==================================================

    if (uniqueModIds.length > 0) {
      const mods = await prisma.mod.findMany({
        where: {
          id: {
            in: uniqueModIds,
          },
          gameId,
          status: "APPROVED",
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (mods.length !== uniqueModIds.length) {
        return NextResponse.json(
          {
            error:
              "Uno o más mods no son válidos para el juego seleccionado",
          },
          { status: 400 }
        );
      }
    }

    // ==================================================
    // 8. Crear el modpack
    // ==================================================

    const newModpack = await prisma.modpack.create({
      data: {
        name: cleanName,
        description:
          typeof description === "string"
            ? description.trim() || null
            : null,
        isPublic: Boolean(isPublic),
        userId: session.userId,
        gameId,

        mods: {
          create: uniqueModIds.map((id) => ({
            modId: id,
          })),
        },
      },
    });

    // ==================================================
    // 9. Respuesta
    // ==================================================

    return NextResponse.json(
      {
        message: "Modpack creado exitosamente",
        modpack: newModpack,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando modpack:", error);

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}