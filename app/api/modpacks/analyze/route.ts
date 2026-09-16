import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

const MAX_MODS = 50;
const MAX_RETRIES = 3;

type GeminiReport = {
  summary: string;
  compatible: boolean;
  incompatibilities: {
    modAId: string;
    modBId: string;
    reason: string;
  }[];
  missingDependencies: {
    modId: string;
    dependencyId: string;
    reason: string;
  }[];
  warnings: string[];
  recommendations: string[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(prompt: string): Promise<GeminiReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error(
          `Gemini error (intento ${attempt}):`,
          responseText
        );

        if (
          (response.status === 429 || response.status === 503) &&
          attempt < MAX_RETRIES
        ) {
          const waitTime = attempt * 1500;

          console.log(
            `Gemini no disponible. Reintentando en ${waitTime}ms...`
          );

          await sleep(waitTime);
          continue;
        }

        throw new Error(
          `Gemini respondió con HTTP ${response.status}: ${responseText}`
        );
      }

      const data = JSON.parse(responseText);

      const generatedText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error("Gemini no devolvió contenido.");
      }

      let parsed: GeminiReport;

      try {
        parsed = JSON.parse(generatedText);
      } catch {
        console.error(
          "Respuesta de Gemini no es JSON válido:",
          generatedText
        );

        throw new Error(
          "Gemini devolvió una respuesta JSON inválida."
        );
      }

      return {
        summary:
          typeof parsed.summary === "string"
            ? parsed.summary
            : "No se pudo generar un resumen.",

        compatible:
          typeof parsed.compatible === "boolean"
            ? parsed.compatible
            : true,

        incompatibilities: Array.isArray(
          parsed.incompatibilities
        )
          ? parsed.incompatibilities
          : [],

        missingDependencies: Array.isArray(
          parsed.missingDependencies
        )
          ? parsed.missingDependencies
          : [],

        warnings: Array.isArray(parsed.warnings)
          ? parsed.warnings
          : [],

        recommendations: Array.isArray(
          parsed.recommendations
        )
          ? parsed.recommendations
          : [],
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error(
              "Error desconocido al comunicarse con Gemini."
            );

      if (attempt < MAX_RETRIES) {
        const waitTime = attempt * 1500;

        console.log(
          `Error de Gemini. Reintentando en ${waitTime}ms...`
        );

        await sleep(waitTime);
      }
    }
  }

  throw (
    lastError ||
    new Error("No se pudo contactar con Gemini.")
  );
}

export async function POST(request: NextRequest) {
  try {
    // ============================================================
    // AUTENTICACIÓN
    // ============================================================

    const cookieStore = await cookies();

    const token = cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: "No autenticado.",
        },
        {
          status: 401,
        }
      );
    }

    const session = await verifyToken(token);

    if (!session) {
      return NextResponse.json(
        {
          error: "Sesión inválida.",
        },
        {
          status: 401,
        }
      );
    }

    // ============================================================
    // BODY
    // ============================================================

    const body = await request.json();

    const gameId =
      typeof body.gameId === "string"
        ? body.gameId
        : "";

    const gameVersionId =
      typeof body.gameVersionId === "string"
        ? body.gameVersionId
        : "";

    const modIds: string[] = Array.isArray(body.modIds)
      ? body.modIds.filter(
          (id: unknown): id is string =>
            typeof id === "string"
        )
      : [];

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

    if (modIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar al menos un mod para analizar.",
        },
        {
          status: 400,
        }
      );
    }

    if (modIds.length > MAX_MODS) {
      return NextResponse.json(
        {
          error: `No puedes analizar más de ${MAX_MODS} mods a la vez.`,
        },
        {
          status: 400,
        }
      );
    }

    // Eliminar IDs repetidos
    const uniqueModIds: string[] = Array.from(
      new Set<string>(modIds)
    );

    // ============================================================
    // VALIDAR JUEGO
    // ============================================================

    const game = await prisma.game.findFirst({
      where: {
        id: gameId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        {
          error: "El juego seleccionado no existe.",
        },
        {
          status: 404,
        }
      );
    }

    // ============================================================
    // VALIDAR VERSIÓN
    // ============================================================

    const gameVersion =
      await prisma.gameVersion.findFirst({
        where: {
          id: gameVersionId,
          gameId,
        },
        select: {
          id: true,
          version: true,
        },
      });

    if (!gameVersion) {
      return NextResponse.json(
        {
          error:
            "La versión seleccionada no pertenece al juego.",
        },
        {
          status: 400,
        }
      );
    }

    // ============================================================
    // OBTENER MODS
    // ============================================================

    const mods = await prisma.mod.findMany({
      where: {
        id: {
          in: uniqueModIds,
        },
        gameId,
        gameVersionId,
        status: "APPROVED",
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        version: true,
      },
    });

    // ============================================================
    // VALIDAR QUE TODOS LOS MODS SEAN VÁLIDOS
    // ============================================================

    if (mods.length !== uniqueModIds.length) {
      return NextResponse.json(
        {
          error:
            "Uno o más mods seleccionados no están disponibles para este juego y versión.",
        },
        {
          status: 400,
        }
      );
    }

    const selectedIds = new Set<string>(uniqueModIds);

    // ============================================================
    // OBTENER CATEGORÍAS
    // ============================================================

    const modCategories =
      await prisma.modCategory.findMany({
        where: {
          modId: {
            in: uniqueModIds,
          },
        },
        select: {
          modId: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    // ============================================================
    // OBTENER DEPENDENCIAS
    // ============================================================

    const modDependencies =
      await prisma.modDependency.findMany({
        where: {
          modId: {
            in: uniqueModIds,
          },
        },
        select: {
          modId: true,
          dependency: {
            select: {
              id: true,
              name: true,
              version: true,
              status: true,
              deletedAt: true,
              gameId: true,
              gameVersionId: true,
            },
          },
        },
      });

    // ============================================================
    // OBTENER INCOMPATIBILIDADES
    // ============================================================

    const modIncompatibilities =
      await prisma.modIncompatibility.findMany({
        where: {
          modId: {
            in: uniqueModIds,
          },
        },
        select: {
          modId: true,
          incompatible: {
            select: {
              id: true,
              name: true,
              version: true,
              status: true,
              deletedAt: true,
              gameId: true,
              gameVersionId: true,
            },
          },
        },
      });

    // ============================================================
    // OBTENER INCOMPATIBILIDADES INVERSAS
    // ============================================================

    const inverseIncompatibilities =
      await prisma.modIncompatibility.findMany({
        where: {
          incompatibleId: {
            in: uniqueModIds,
          },
        },
        select: {
          modId: true,
          incompatibleId: true,
        },
      });

    const inverseModIds = [
      ...new Set(
        inverseIncompatibilities.map(
          (relation) => relation.modId
        )
      ),
    ];

    let inverseDetails: {
      modId: string;
      modName: string;
      incompatibleId: string;
      incompatibleName: string;
    }[] = [];

    if (inverseModIds.length > 0) {
      const inverseMods = await prisma.mod.findMany({
        where: {
          id: {
            in: inverseModIds,
          },
          gameId,
          gameVersionId,
          status: "APPROVED",
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
      });

      const selectedModsMap = new Map(
        mods.map((mod) => [mod.id, mod])
      );

      inverseDetails = inverseIncompatibilities
        .map((relation) => {
          const sourceMod = inverseMods.find(
            (mod) => mod.id === relation.modId
          );

          const selectedMod = selectedModsMap.get(
            relation.incompatibleId
          );

          if (!sourceMod || !selectedMod) {
            return null;
          }

          return {
            modId: sourceMod.id,
            modName: sourceMod.name,
            incompatibleId: selectedMod.id,
            incompatibleName: selectedMod.name,
          };
        })
        .filter(
          (
            item
          ): item is {
            modId: string;
            modName: string;
            incompatibleId: string;
            incompatibleName: string;
          } => item !== null
        );
    }

    // ============================================================
    // ANALIZAR DEPENDENCIAS
    // ============================================================

    const missingDependencies: {
      modId: string;
      modName: string;
      dependencyId: string;
      dependencyName: string;
    }[] = [];

    const modsMap = new Map(
      mods.map((mod) => [mod.id, mod])
    );

    for (const relation of modDependencies) {
      const mod = modsMap.get(relation.modId);

      if (!mod) {
        continue;
      }

      const dependency = relation.dependency;

      // Ya está seleccionado
      if (selectedIds.has(dependency.id)) {
        continue;
      }

      // Solo consideramos dependencias válidas
      // del mismo juego y versión.
      if (
        dependency.status !== "APPROVED" ||
        dependency.deletedAt !== null ||
        dependency.gameId !== gameId ||
        dependency.gameVersionId !== gameVersionId
      ) {
        continue;
      }

      missingDependencies.push({
        modId: mod.id,
        modName: mod.name,
        dependencyId: dependency.id,
        dependencyName: dependency.name,
      });
    }

    // ============================================================
    // ANALIZAR INCOMPATIBILIDADES
    // ============================================================

    const incompatibilities: {
      modAId: string;
      modAName: string;
      modBId: string;
      modBName: string;
    }[] = [];

    const registeredPairs = new Set<string>();

    function registerIncompatibility(
      modAId: string,
      modAName: string,
      modBId: string,
      modBName: string
    ) {
      if (
        !selectedIds.has(modAId) ||
        !selectedIds.has(modBId)
      ) {
        return;
      }

      if (modAId === modBId) {
        return;
      }

      const pair = [modAId, modBId]
        .sort()
        .join(":");

      if (registeredPairs.has(pair)) {
        return;
      }

      registeredPairs.add(pair);

      incompatibilities.push({
        modAId,
        modAName,
        modBId,
        modBName,
      });
    }

    // Relaciones directas
    for (const relation of modIncompatibilities) {
      const sourceMod = modsMap.get(relation.modId);

      if (!sourceMod) {
        continue;
      }

      const incompatible = relation.incompatible;

      if (
        incompatible.status !== "APPROVED" ||
        incompatible.deletedAt !== null ||
        incompatible.gameId !== gameId ||
        incompatible.gameVersionId !== gameVersionId
      ) {
        continue;
      }

      registerIncompatibility(
        sourceMod.id,
        sourceMod.name,
        incompatible.id,
        incompatible.name
      );
    }

    // Relaciones inversas
    for (const relation of inverseDetails) {
      registerIncompatibility(
        relation.modId,
        relation.modName,
        relation.incompatibleId,
        relation.incompatibleName
      );
    }

    // ============================================================
    // PREPARAR INFORMACIÓN PARA GEMINI
    // ============================================================

    const modsForAI = mods.map((mod) => {
      const categories = modCategories
        .filter(
          (relation) => relation.modId === mod.id
        )
        .map(
          (relation) => relation.category.name
        );

      const dependencies = modDependencies
        .filter(
          (relation) => relation.modId === mod.id
        )
        .map(
          (relation) => relation.dependency
        )
        .filter(
          (dependency) =>
            dependency.status === "APPROVED" &&
            dependency.deletedAt === null &&
            dependency.gameId === gameId &&
            dependency.gameVersionId ===
              gameVersionId
        )
        .map((dependency) => ({
          id: dependency.id,
          name: dependency.name,
          version: dependency.version,
        }));

      const incompatibilitiesForMod =
        incompatibilities
          .filter(
            (item) =>
              item.modAId === mod.id ||
              item.modBId === mod.id
          )
          .map((item) => {
            if (item.modAId === mod.id) {
              return {
                id: item.modBId,
                name: item.modBName,
              };
            }

            return {
              id: item.modAId,
              name: item.modAName,
            };
          });

      return {
        id: mod.id,
        name: mod.name,
        version: mod.version,
        categories,
        dependencies,
        incompatibilities:
          incompatibilitiesForMod,
      };
    });

    // ============================================================
    // DATOS DETERMINISTAS
    // ============================================================

    const deterministicIncompatibilities =
      incompatibilities.map((item) => ({
        modA: {
          id: item.modAId,
          name: item.modAName,
        },
        modB: {
          id: item.modBId,
          name: item.modBName,
        },
      }));

    const deterministicMissingDependencies =
      missingDependencies.map((item) => ({
        mod: {
          id: item.modId,
          name: item.modName,
        },
        dependency: {
          id: item.dependencyId,
          name: item.dependencyName,
        },
      }));

    // ============================================================
    // PROMPT
    // ============================================================

    const prompt = `
Eres un asistente para analizar un modpack.

Tu trabajo es analizar ÚNICAMENTE la información proporcionada.

NO inventes mods, dependencias, incompatibilidades ni requisitos.

Juego:

${game.name}

Versión:

${gameVersion.version}

Mods seleccionados:

${JSON.stringify(modsForAI, null, 2)}

Incompatibilidades detectadas directamente en la base de datos:

${JSON.stringify(
  deterministicIncompatibilities,
  null,
  2
)}

Dependencias faltantes detectadas directamente en la base de datos:

${JSON.stringify(
  deterministicMissingDependencies,
  null,
  2
)}

REGLAS:

1. Si existe una incompatibilidad en los datos de la base de datos, debes incluirla.

2. Si existe una dependencia faltante en los datos de la base de datos, debes incluirla.

3. No inventes relaciones que no aparecen en los datos.

4. Puedes explicar brevemente por qué una relación conocida puede ser problemática.

5. Si no hay incompatibilidades conocidas, no inventes ninguna.

6. Si no hay dependencias faltantes conocidas, no inventes ninguna.

7. Las recomendaciones deben basarse únicamente en los datos proporcionados.

8. La propiedad "compatible" debe ser false si existe al menos una incompatibilidad conocida.

9. Una dependencia faltante debe aparecer en "missingDependencies".

10. Responde ÚNICAMENTE con JSON válido.

El JSON debe tener exactamente esta estructura:

{
  "summary": "Resumen breve del análisis",
  "compatible": true,
  "incompatibilities": [
    {
      "modAId": "ID",
      "modBId": "ID",
      "reason": "Explicación breve"
    }
  ],
  "missingDependencies": [
    {
      "modId": "ID",
      "dependencyId": "ID",
      "reason": "Explicación breve"
    }
  ],
  "warnings": [
    "Advertencia"
  ],
  "recommendations": [
    "Recomendación"
  ]
}
`;

    // ============================================================
    // LLAMAR A GEMINI
    // ============================================================

    let report: GeminiReport;

    try {
      report = await callGemini(prompt);
    } catch (error) {
      console.error("Gemini error:", error);

      // ==========================================================
      // FALLBACK
      // ==========================================================

      const fallbackIncompatibilities =
        incompatibilities.map((item) => ({
          modAId: item.modAId,
          modBId: item.modBId,
          reason:
            "Estos mods están registrados como incompatibles en la base de datos.",
        }));

      const fallbackDependencies =
        missingDependencies.map((item) => ({
          modId: item.modId,
          dependencyId: item.dependencyId,
          reason: `El mod "${item.modName}" tiene registrada esta dependencia: "${item.dependencyName}".`,
        }));

      const fallbackReport: GeminiReport = {
        summary:
          fallbackIncompatibilities.length > 0
            ? "Se encontraron incompatibilidades conocidas entre los mods seleccionados."
            : fallbackDependencies.length > 0
              ? "No se encontraron incompatibilidades, pero existen dependencias que no fueron seleccionadas."
              : "No se encontraron incompatibilidades ni dependencias faltantes registradas.",

        compatible:
          fallbackIncompatibilities.length === 0,

        incompatibilities:
          fallbackIncompatibilities,

        missingDependencies:
          fallbackDependencies,

        warnings:
          fallbackIncompatibilities.length === 0 &&
          fallbackDependencies.length === 0
            ? []
            : [
                "El análisis de inteligencia artificial no estuvo disponible temporalmente. Se muestran únicamente las relaciones registradas en la base de datos.",
              ],

        recommendations:
          fallbackDependencies.length > 0
            ? [
                "Considera agregar las dependencias faltantes al modpack.",
              ]
            : [],
      };

      return NextResponse.json(
        {
          success: true,
          aiAvailable: false,

          game: {
            id: game.id,
            name: game.name,
          },

          version: {
            id: gameVersion.id,
            version: gameVersion.version,
          },

          selectedMods: mods.map((mod) => ({
            id: mod.id,
            name: mod.name,
            version: mod.version,
          })),

          report: fallbackReport,

          message:
            "Gemini no está disponible temporalmente. Se realizó el análisis utilizando los datos registrados en la base de datos.",
        },
        {
          status: 200,
        }
      );
    }

    // ============================================================
    // LIMPIAR RESPUESTA DE GEMINI
    // ============================================================

    const validIncompatibilityPairs =
      new Set(
        incompatibilities.map((item) =>
          [item.modAId, item.modBId]
            .sort()
            .join(":")
        )
      );

    report.incompatibilities =
      report.incompatibilities.filter((item) => {
        if (
          !selectedIds.has(item.modAId) ||
          !selectedIds.has(item.modBId)
        ) {
          return false;
        }

        const pair = [
          item.modAId,
          item.modBId,
        ]
          .sort()
          .join(":");

        return validIncompatibilityPairs.has(pair);
      });

    const validDependencies = new Set(
      missingDependencies.map(
        (item) =>
          `${item.modId}:${item.dependencyId}`
      )
    );

    report.missingDependencies =
      report.missingDependencies.filter(
        (item) =>
          validDependencies.has(
            `${item.modId}:${item.dependencyId}`
          )
      );

    // ============================================================
    // ASEGURAR COMPATIBILIDAD
    // ============================================================

    if (report.incompatibilities.length > 0) {
      report.compatible = false;
    }

    // ============================================================
    // RESPUESTA
    // ============================================================

    return NextResponse.json(
      {
        success: true,
        aiAvailable: true,

        game: {
          id: game.id,
          name: game.name,
        },

        version: {
          id: gameVersion.id,
          version: gameVersion.version,
        },

        selectedMods: mods.map((mod) => ({
          id: mod.id,
          name: mod.name,
          version: mod.version,
        })),

        report,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "Error en /api/modpacks/analyze:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al analizar el modpack.",
      },
      {
        status: 500,
      }
    );
  }
}