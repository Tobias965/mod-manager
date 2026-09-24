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

    // 1. OBTENER MODS Y SUS RELACIONES
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

    // DICCIONARIO PARA MAPEAR CUALQUIER UUID A SU NOMBRE CORRESPONDIENTE
    const modNamesMap = new Map<string, string>();
    mods.forEach((mod) => {
      modNamesMap.set(mod.id, mod.name);
      mod.dependencies.forEach((dep) => {
        if (dep.dependency) modNamesMap.set(dep.dependencyId, dep.dependency.name);
      });
      mod.incompatibilities.forEach((inc) => {
        if (inc.incompatible) modNamesMap.set(inc.incompatibleId, inc.incompatible.name);
      });
    });

    // 2. MAPEAR DEPENDENCIAS FALTANTES
    const missingDependencies = mods.flatMap((mod) =>
      mod.dependencies
        .filter((dependency) => !selectedIds.has(dependency.dependencyId))
        .map((dependency) => ({
          modId: mod.id,
          modName: mod.name,
          dependencyId: dependency.dependencyId,
          dependencyName: dependency.dependency?.name ?? "Mod requerido",
          reason: `El mod "${mod.name}" requiere el mod "${dependency.dependency?.name ?? "desconocido"}", pero no está seleccionado.`,
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
          modBName: incompatibility.incompatible?.name ?? "Mod incompatible",
          reason: `El mod "${mod.name}" es incompatible con "${incompatibility.incompatible?.name ?? "desconocido"}".`,
        }))
    );

    // 4. GENERAR RECOMENDACIONES PRECISAS DIRECTAMENTE DESDE EL BACKEND
    const exactRecommendations: string[] = [
      ...missingDependencies.map(
        (d) => `Añadir el mod "${d.dependencyName}" para completar la configuración de "${d.modName}".`
      ),
      ...incompatibilities.map(
        (i) => `Remover "${i.modAName}" o "${i.modBName}" para resolver la incompatibilidad.`
      ),
    ];

    // 5. SANITIZADOR PARA REEMPLAZAR O ELIMINAR CUALQUIER UUID REZAGADO
    const cleanText = (text: string): string => {
      if (!text) return text;
      const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
      let cleaned = text.replace(uuidRegex, (uuid) => {
        const name = modNamesMap.get(uuid);
        return name ? `"${name}"` : "el mod";
      });
      return cleaned.replace(/\bcon (el )?ID\b\s*/gi, "").replace(/\s+/g, " ").trim();
    };

    // DATOS SANITIZADOS PARA LA IA
    const modsForAi = mods.map((m) => ({ name: m.name, version: m.version }));
    const missingDependenciesForAi = missingDependencies.map((d) => ({
      modName: d.modName,
      missingDependencyName: d.dependencyName,
    }));
    const incompatibilitiesForAi = incompatibilities.map((i) => ({
      modAName: i.modAName,
      modBName: i.modBName,
    }));

    const prompt = `Analiza este modpack. Responde únicamente con un JSON válido.
Estructura esperada:
{"summary":"string","compatible":true,"warnings":["string"],"recommendations":["string"]}

REGLA CRÍTICA: Mención de IDs o UUIDs está PROHIBIDA. Usa solo los nombres de los mods.

Juego: ${gameVersion.game.name}
Versión: ${gameVersion.version}
Mods seleccionados: ${JSON.stringify(modsForAi)}
Dependencias faltantes: ${JSON.stringify(missingDependenciesForAi)}
Incompatividades: ${JSON.stringify(incompatibilitiesForAi)}`;

    const result = await generateAnalysis(prompt);
    const report = parseReport(result.text);

    // Si existen problemas de dependencias o incompatibilidades, usamos las recomendaciones exactas del backend.
    // Si no los hay, usamos las de la IA pasadas por el filtro sanitizador.
    const finalRecommendations = exactRecommendations.length > 0
      ? exactRecommendations
      : report.recommendations.map(cleanText).filter(Boolean);

    return NextResponse.json({
      report: {
        summary: cleanText(report.summary),
        warnings: report.warnings.map(cleanText),
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