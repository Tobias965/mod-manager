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

    // 1. OBTENER MODS E INCLUIR NOMBRES DE DEPENDENCIAS E INCOMPATIBILIDADES
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

    const modNamesMap = new Map<string, string>();
    mods.forEach((mod) => {
      modNamesMap.set(mod.id, mod.name);
      mod.dependencies.forEach((dep) => modNamesMap.set(dep.dependencyId, dep.dependency.name));
      mod.incompatibilities.forEach((inc) => modNamesMap.set(inc.incompatibleId, inc.incompatible.name));
    });

    // 2. MAPEAR NOMBRES EN DEPENDENCIAS FALTANTES
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

    // 3. MAPEAR NOMBRES EN INCOMPATIBILIDADES
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

    // 4. PROMPT CON REGLAS DE NOMBRES HUMANOS
    const prompt = `Analiza este modpack. Debes responder únicamente con un objeto JSON válido, sin markdown, sin texto adicional y sin bloques de código.
La respuesta debe cumplir exactamente esta estructura:
{"summary":"string","compatible":true,"warnings":["string"],"missingDependencies":[{"modId":"string","modName":"string","dependencyId":"string","dependencyName":"string","reason":"string"}],"incompatibilities":[{"modAId":"string","modAName":"string","modBId":"string","modBName":"string","reason":"string"}],"recommendations":["string"]}

REGLA CRÍTICA: En los textos narrativos (summary, warnings, recommendations, reason), utiliza SIEMPRE los nombres legibles de los mods (ejemplo: "Photo Realistic Mode", "Graphics API"). Queda ESTRICTAMENTE PROHIBIDO mostrar o mencionar UUIDs o IDs en las explicaciones.

Juego: ${gameVersion.game.name}
Versión: ${gameVersion.version}
Mods seleccionados: ${JSON.stringify(
      mods.map((m) => ({ id: m.id, name: m.name, version: m.version }))
    )}
Dependencias faltantes detectadas: ${JSON.stringify(missingDependencies)}
Incompatibilidades detectadas: ${JSON.stringify(incompatibilities)}`;

    const result = await generateAnalysis(prompt);
    const report = parseReport(result.text);

    const replaceIdsWithNames = (text: string) => {
      const uuidRegex = /(?:con ID\s*|ID\s*)?([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/gi;
      return text.replace(uuidRegex, (match, uuid) => {
        const name = modNamesMap.get(uuid);
        return name ? `'${name}'` : match; 
      });
    };

    report.summary = replaceIdsWithNames(report.summary);
    report.warnings = report.warnings.map(replaceIdsWithNames);
    report.recommendations = report.recommendations.map(replaceIdsWithNames);

    return NextResponse.json({
      report: {
        ...report,
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