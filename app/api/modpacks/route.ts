import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { createModpack } from "@/lib/modpacks";

export async function POST(request: Request) {
  try {
    // ==================================================
    // 1. Verificar autenticación
    // ==================================================

    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

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
      gameVersionId,
    } = body;

    if (typeof name !== "string") {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }
    if (typeof gameId !== "string" || typeof modIds === "undefined") {
      return NextResponse.json(
        { error: "El juego y los mods son obligatorios" },
        { status: 400 }
      );
    }

    if (!Array.isArray(modIds)) {
      return NextResponse.json(
        { error: "La lista de mods no es válida" },
        { status: 400 }
      );
    }

    const stringModIds = modIds.filter(
      (id): id is string => typeof id === "string"
    );

    const newModpack = await createModpack(
      {
        name,
        description: typeof description === "string" ? description : null,
        isPublic: Boolean(isPublic),
        gameId,
        gameVersionId: typeof gameVersionId === "string" ? gameVersionId : "",
        modIds: stringModIds,
      },
      session
    );

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