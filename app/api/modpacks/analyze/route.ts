import { NextResponse } from "next/server";

import { getSessionFromRequest } from "@/lib/auth";
import { generateAnalysis } from "@/lib/ai/analyze";
import { prisma } from "@/lib/prisma";

type AnalysisReport = {
  summary: string;
  compatible: boolean;
  warnings: string[];
  missingDependencies: Array<{
    modId: string;
    modName?: string;
    dependencyId: string;
    dependencyName?: string;
    reason: string;
  }>;
  incompatibilities: Array<{
    modAId: string;
    modAName?: string;
    modBId: string;
    modBName?: string;
    reason: string;
  }>;
  recommendations: string[];
};

const emptyReport: AnalysisReport = {
  summary: "No se pudo generar un análisis.",
  compatible: true,
  warnings: [],
  missingDependencies: [],
  incompatibilities: [],
  recommendations: [],
};

function parseReport(text: string): AnalysisReport {
  const parsed = JSON.parse(text) as Partial<AnalysisReport>;

  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : emptyReport.summary,
    compatible: typeof parsed.compatible === "boolean" ? parsed.compatible : true,
    warnings: Array.isArray(parsed.warnings)
      ? parsed.warnings.filter((value): value is string => typeof value === "string")
      : [],
    missingDependencies: Array.isArray(parsed.missingDependencies)
      ? parsed.missingDependencies.filter(
          (value): value is AnalysisReport["missingDependencies"][number] =>
            typeof value?.modId === "string" &&
            typeof value?.dependencyId === "string" &&
            typeof value?.reason === "string"
        )
      : [],
    incompatibilities: Array.isArray(parsed.incompatibilities)
      ? parsed.incompatibilities.filter(
          (value): value is AnalysisReport["incompatibilities"][number] =>
            typeof value?.modAId === "string" &&
            typeof value?.modBId === "string" &&
            typeof value?.reason === "string"
        )
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((value): value is string => typeof value === "string")
      : [],
  };
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();
    const gameId = typeof body.gameId === "string" ? body.gameId : "";
    const gameVersionId = typeof body.gameVersionId === "string" ? body.gameVersionId : "";
    const modIds: string[] = Array.isArray(body.modIds)
      ? body.modIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    if (!gameId || !gameVersionId || modIds.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar un juego, una versión y al menos un mod." },
        { status: 400 }
      );
    }

    const gameVersion = await prisma.gameVersion.findFirst({
      where: { id: gameVersionId, gameId, game: { deletedAt: null } },
      select: { version: true, game: { select: { name: true } } },
    });

    if (!gameVersion) {
      return NextResponse.json(
        { error: "La versión seleccionada no pertenece a un juego disponible." },
        { status: 400 }
      );
    }

    // 1. OBTENER MODS CON DEPENDENCIAS E INCOMPATIBILIDADES
    const mods = await prisma.mod.findMany({
      where: {
        id: { in: modIds },
        gameId,
        gameVersionId,
        status: "APPROVED",
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        version: true,
        dependencies: {
          select: {
            dependencyId: true,
            dependency: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        incompatibilities: {
          select: {
            incompatibleId: true,
            incompatible: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (mods.length !== modIds.length) {
      return NextResponse.json(
        { error: "Uno o más mods seleccionados no están disponibles." },
        { status: 400 }
      );
    }

    const selectedIds = new Set(modIds);

    // 2. MAPEAR DEPENDENCIAS FALTANTES
    const missingDependencies = mods.flatMap((mod) =>
      mod.dependencies
        .filter((dependency) => !selectedIds.has(dependency.dependencyId))
        .map((dependency) => ({
          modId: mod.id,
          modName: mod.name,
          dependencyId: dependency.dependencyId,
          dependencyName: dependency.dependency.name,
          reason: `El mod "${mod.name}" requiere el mod "${dependency.dependency.name}", pero no está seleccionado.`,
        }))
    );

    // 3. MAPEAR INCOMPATIBILIDADES
    const incompatibilities = mods.flatMap((mod) =>
      mod.incompatibilities
        .filter((incompatibility) => selectedIds.has(incompatibility.incompatibleId))
        .map((incompatibility) => ({
          modAId: mod.id,
          modAName: mod.name,
          modBId: incompatibility.incompatibleId,
          modBName: incompatibility.incompatible.name,
          reason: `El mod "${mod.name}" es incompatible con "${incompatibility.incompatible.name}".`,
        }))
    );

    // 4. PREPARAR DATOS SANITIZADOS PARA LA IA (SIN UUIDs)
    const modsForAi = mods.map((m) => ({
      name: m.name,
      version: m.version,
    }));

    const missingDependenciesForAi = missingDependencies.map((d) => ({
      modName: d.modName,
      missingDependencyName: d.dependencyName,
      reason: d.reason,
    }));

    const incompatibilitiesForAi = incompatibilities.map((i) => ({
      modAName: i.modAName,
      modBName: i.modBName,
      reason: i.reason,
    }));

    const prompt = `Analiza este modpack. Debes responder únicamente con un objeto JSON válido, sin markdown, sin texto adicional y sin bloques de código.
La respuesta debe cumplir exactamente esta estructura:
{"summary":"string","compatible":true,"warnings":["string"],"recommendations":["string"]}

REGLA ABSOLUTA: Utiliza ÚNICAMENTE los nombres legibles de los mods provistos en los datos. Queda estrictamente prohibido mostrar o inventar códigos o IDs.

Juego: ${gameVersion.game.name}
Versión: ${gameVersion.version}
Mods seleccionados: ${JSON.stringify(modsForAi)}
Dependencias faltantes detectadas: ${JSON.stringify(missingDependenciesForAi)}
Incompatibilidades detectadas: ${JSON.stringify(incompatibilitiesForAi)}`;

    const result = await generateAnalysis(prompt);
    const report = parseReport(result.text);

    // 5. GENERAR RECOMENDACIONES DETERMINISTAS EN TYPESCRIPT
    const exactRecommendations: string[] = [
      ...missingDependencies.map(
        (d) => `Añadir el mod "${d.dependencyName}" para completar la configuración de "${d.modName}".`
      ),
      ...incompatibilities.map(
        (i) => `Remover "${i.modAName}" o "${i.modBName}" para resolver la incompatibilidad entre ellos.`
      ),
    ];

    // Combinar las recomendaciones automáticas de TypeScript con sugerencias extras de la IA si existen
    const finalRecommendations = Array.from(
      new Set([...exactRecommendations, ...report.recommendations])
    );

    return NextResponse.json({
      report: {
        ...report,
        recommendations: finalRecommendations,
        missingDependencies,
        incompatibilities,
        compatible:
          missingDependencies.length === 0 &&
          incompatibilities.length === 0 &&
          report.compatible,
      },
      provider: result.provider,
    });
  } catch (error) {
    console.error("Error en /api/modpacks/analyze:", error);
    return NextResponse.json(
      { error: "No se pudo analizar el modpack en este momento." },
      { status: 502 }
    );
  }
}