import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { generateAnalysis } from "@/lib/ai/analyze";
import { prisma } from "@/lib/prisma";

// 1. Definimos estrictamente lo que la IA nos va a devolver (sin dependencias ni IDs)
type AIAnalysisReport = {
  summary: string;
  compatible: boolean;
  warnings: string[];
  recommendations: string[];
};

function parseReport(text: string): AIAnalysisReport {
  // Salvaguarda: Si la IA devuelve el JSON envuelto en markdown (```json ... ```), lo extraemos
  let jsonText = text;
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    jsonText = match[0];
  }

  try {
    const parsed = JSON.parse(jsonText) as Partial<AIAnalysisReport>;
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : "No se pudo generar un análisis detallado.",
      compatible: typeof parsed.compatible === "boolean" ? parsed.compatible : true,
      warnings: Array.isArray(parsed.warnings)
        ? parsed.warnings.filter((value): value is string => typeof value === "string")
        : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((value): value is string => typeof value === "string")
        : [],
    };
  } catch (error) {
    console.error("Error parseando JSON de la IA:", error);
    return {
      summary: "Error al interpretar la respuesta de la IA.",
      compatible: true,
      warnings: [],
      recommendations: [],
    };
  }
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

    // 1. OBTENER MODS Y SUS RELACIONES DESDE LA BASE DE DATOS
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

    // DICCIONARIO PARA MAPEAR UUID A SU NOMBRE
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

    // 2. MAPEAR DEPENDENCIAS FALTANTES CON NOMBRES OBLIGATORIOS PARA LA VISTA
    const missingDependencies = mods.flatMap((mod) =>
      mod.dependencies
        .filter((dependency) => !selectedIds.has(dependency.dependencyId))
        .map((dependency) => {
          const depName = dependency.dependency?.name ?? "Mod requerido desconocido";
          return {
            modId: mod.id, 
            modName: mod.name,
            dependencyId: dependency.dependencyId,
            dependencyName: depName,
            reason: `El mod "${mod.name}" requiere el mod "${depName}", pero no está seleccionado.`,
          };
        })
    );

    // 3. MAPEAR INCOMPATIBILIDADES CON NOMBRES OBLIGATORIOS PARA LA VISTA
    const incompatibilities = mods.flatMap((mod) =>
      mod.incompatibilities
        .filter((incompatibility) => selectedIds.has(incompatibility.incompatibleId))
        .map((incompatibility) => {
          const incName = incompatibility.incompatible?.name ?? "Mod incompatible desconocido";
          return {
            modAId: mod.id,
            modAName: mod.name,
            modBId: incompatibility.incompatibleId,
            modBName: incName,
            reason: `El mod "${mod.name}" es incompatible con "${incName}".`,
          };
        })
    );

    // 4. GENERAR RECOMENDACIONES EXACTAS DESDE EL BACKEND
    const exactRecommendations: string[] = [
      ...missingDependencies.map(
        (d) => `Añadir el mod "${d.dependencyName}" para completar la configuración de "${d.modName}".`
      ),
      ...incompatibilities.map(
        (i) => `Remover "${i.modAName}" o "${i.modBName}" para resolver la incompatibilidad.`
      ),
    ];

    // 5. SANITIZADOR PARA CUALQUIER UUID REZAGADO
    const cleanText = (text: string): string => {
      if (!text) return text;
      const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
      let cleaned = text.replace(uuidRegex, (uuid) => {
        const name = modNamesMap.get(uuid);
        // Si no encuentra el nombre, ponemos un comodín para que el usuario jamás vea el UUID
        return name ? `"${name}"` : "un mod"; 
      });
      return cleaned.replace(/\bcon (el )?ID\b\s*/gi, "").replace(/\s+/g, " ").trim();
    };

    // DATOS SANITIZADOS PARA LA IA (Solo recibe nombres)
    const modsForAi = mods.map((m) => ({ name: m.name, version: m.version }));
    const missingDependenciesForAi = missingDependencies.map((d) => ({
      modName: d.modName,
      missingDependencyName: d.dependencyName, // Sin IDs aquí
    }));
    const incompatibilitiesForAi = incompatibilities.map((i) => ({
      modAName: i.modAName,
      modBName: i.modBName, // Sin IDs aquí
    }));

    const prompt = `Analiza este modpack. Responde únicamente con un JSON válido.
Estructura esperada:
{"summary":"string","compatible":true,"warnings":["string"],"recommendations":["string"]}

REGLA CRÍTICA: Mención de IDs o UUIDs está PROHIBIDA. Usa solo los nombres de los mods.

Juego: ${gameVersion.game.name}
Versión: ${gameVersion.version}
Mods seleccionados: ${JSON.stringify(modsForAi)}
Dependencias faltantes: ${JSON.stringify(missingDependenciesForAi)}
Incompatibilidades: ${JSON.stringify(incompatibilitiesForAi)}`;

    const result = await generateAnalysis(prompt);
    const aiReport = parseReport(result.text);

    // Unificamos las recomendaciones exactas del backend con las de la IA (sanitizadas)
    const finalRecommendations = Array.from(new Set([
      ...exactRecommendations,
      ...aiReport.recommendations.map(cleanText).filter(Boolean)
    ]));

    // RESPUESTA DEFINITIVA HACIA EL FRONTEND
    return NextResponse.json({
      report: {
        summary: cleanText(aiReport.summary),
        warnings: aiReport.warnings.map(cleanText),
        recommendations: finalRecommendations,
        // Al enviar estos arrays calculados arriba, la vista recibe garantizado 'modName' y 'dependencyName'
        missingDependencies, 
        incompatibilities,
        compatible:
          missingDependencies.length === 0 &&
          incompatibilities.length === 0 &&
          aiReport.compatible,
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