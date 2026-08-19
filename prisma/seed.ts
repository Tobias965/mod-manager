import "dotenv/config";

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🌱 Iniciando seed...");

  // =========================
  // JUEGOS
  // =========================

  const forge = await prisma.game.findFirst({
    where: {
      name: "Minecraft",
      loader: "Forge",
      version: "1.20.1",
    },
  });

  const forgeGame =
    forge ??
    (await prisma.game.create({
      data: {
        name: "Minecraft",
        loader: "Forge",
        version: "1.20.1",
      },
    }));

  const fabric = await prisma.game.findFirst({
    where: {
      name: "Minecraft",
      loader: "Fabric",
      version: "1.20.1",
    },
  });

  const fabricGame =
    fabric ??
    (await prisma.game.create({
      data: {
        name: "Minecraft",
        loader: "Fabric",
        version: "1.20.1",
      },
    }));

  console.log("✓ Juegos creados");

  // =========================
  // MODS
  // =========================

  const jeiExisting = await prisma.mod.findFirst({
    where: {
      name: "JEI",
      version: "15.20.0.105",
      gameId: forgeGame.id,
    },
  });

  const jei =
    jeiExisting ??
    (await prisma.mod.create({
      data: {
        name: "JEI",
        version: "15.20.0.105",
        gameId: forgeGame.id,
      },
    }));

  const optifineExisting = await prisma.mod.findFirst({
    where: {
      name: "OptiFine",
      version: "HD U I6",
      gameId: forgeGame.id,
    },
  });

  const optifine =
    optifineExisting ??
    (await prisma.mod.create({
      data: {
        name: "OptiFine",
        version: "HD U I6",
        gameId: forgeGame.id,
      },
    }));

  const sodiumExisting = await prisma.mod.findFirst({
    where: {
      name: "Sodium",
      version: "0.5.11",
      gameId: fabricGame.id,
    },
  });

  const sodium =
    sodiumExisting ??
    (await prisma.mod.create({
      data: {
        name: "Sodium",
        version: "0.5.11",
        gameId: fabricGame.id,
      },
    }));

  console.log("✓ Mods creados");

  // =========================
  // INCOMPATIBILIDAD
  // =========================

  await prisma.modIncompatibility.upsert({
    where: {
      modId_incompatibleId: {
        modId: optifine.id,
        incompatibleId: sodium.id,
      },
    },
    update: {},
    create: {
      modId: optifine.id,
      incompatibleId: sodium.id,
    },
  });

  console.log("✓ Incompatibilidad creada");

  // =========================
  // RESUMEN
  // =========================

  console.log("");
  console.log("🌱 Seed completado correctamente");
  console.log("");
  console.log(`Juegos: 2`);
  console.log(`Mods: 3`);
  console.log(`Incompatibilidades: 1`);
}

main()
  .catch((error) => {
    console.error("❌ Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });