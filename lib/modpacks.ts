import { prisma } from "@/lib/prisma";
import type { Session } from "@/lib/auth";

export type CreateModpackInput = {
  name: string;
  description?: string | null;
  isPublic: boolean;
  gameId: string;
  gameVersionId: string;
  modIds: string[];
};

export async function createModpack(
  input: CreateModpackInput,
  session: Session
) {
  const name = input.name.trim();
  const gameId = input.gameId.trim();
  const gameVersionId = input.gameVersionId.trim();

  if (!name) throw new Error("El nombre del modpack es obligatorio");
  if (!gameId) throw new Error("Debes seleccionar un juego");
  if (!gameVersionId) {
    throw new Error("Debes seleccionar una versión del juego");
  }

  if (session.role !== "CREATOR" && session.role !== "ADMIN" && session.role !== "USER") {
    throw new Error("No tienes permisos para crear modpacks");
  }

  const game = await prisma.game.findFirst({
    where: { id: gameId, deletedAt: null },
    select: { id: true },
  });

  if (!game) throw new Error("El juego seleccionado no existe");

  const gameVersion = await prisma.gameVersion.findFirst({
    where: { id: gameVersionId, gameId },
    select: { id: true },
  });

  if (!gameVersion) {
    throw new Error("La versión seleccionada no pertenece al juego");
  }

  const uniqueModIds = [...new Set(input.modIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueModIds.length > 0) {
    const validMods = await prisma.mod.findMany({
      where: {
        id: { in: uniqueModIds },
        gameId,
        gameVersionId,
        status: "APPROVED",
        deletedAt: null,
      },
      select: { id: true },
    });

    if (validMods.length !== uniqueModIds.length) {
      throw new Error(
        "Uno o más mods seleccionados no son válidos para este juego y versión"
      );
    }
  }

  return prisma.modpack.create({
    data: {
      name,
      description: input.description?.trim() || null,
      isPublic: input.isPublic,
      userId: session.userId,
      gameId,
      mods: {
        create: uniqueModIds.map((modId) => ({ modId })),
      },
    },
  });
}