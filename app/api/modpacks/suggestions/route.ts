import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionFromRequest } from "@/lib/auth";
import { generateSuggestions } from "@/lib/ai/suggestions";

type AISuggestion = {
  modId: string;
  reason: string;
};

type AIResponse = {
  suggestions?: AISuggestion[];
};

export async function POST(req: Request) {
  try {
    // --------------------------------------------------
    // AUTENTICACIÓN
    // --------------------------------------------------

    const user = await getSessionFromRequest(req);

    if (!user) {
      return NextResponse.json(
        {
          error: "No autenticado",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // DATOS DE LA SOLICITUD
    // --------------------------------------------------

    const body = await req.json();

    const gameId =
      typeof body.gameId === "string"
        ? body.gameId
        : undefined;

    const gameVersionId =
      typeof body.gameVersionId === "string"
        ? body.gameVersionId
        : undefined;

    const categoryId =
      typeof body.categoryId === "string"
        ? body.categoryId
        : undefined;

    const selectedModIds = Array.isArray(body.modIds)
      ? body.modIds.filter(
          (id: unknown): id is string =>
            typeof id === "string",
        )
      : [];

    if (!gameId || !gameVersionId || !categoryId) {
      return NextResponse.json(
        {
          error:
            "Faltan datos para generar las sugerencias.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // VALIDAR VERSIÓN DEL JUEGO
    // --------------------------------------------------

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
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // VALIDAR CATEGORÍA
    // --------------------------------------------------

    const category =
      await prisma.category.findUnique({
        where: {
          id: categoryId,
        },
        select: {
          id: true,
          name: true,
        },
      });

    if (!category) {
      return NextResponse.json(
        {
          error:
            "La categoría seleccionada no existe.",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // MODS SELECCIONADOS
    // --------------------------------------------------

    const selectedMods =
      selectedModIds.length > 0
        ? await prisma.mod.findMany({
            where: {
              id: {
                in: selectedModIds,
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

              categories: {
                select: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },

              dependencies: {
                select: {
                  dependency: {
                    select: {
                      id: true,
                      name: true,
                      version: true,
                    },
                  },
                },
              },

              incompatibilities: {
                select: {
                  incompatible: {
                    select: {
                      id: true,
                      name: true,
                      version: true,
                    },
                  },
                },
              },
            },
          })
        : [];

    const selectedSet = new Set(
      selectedMods.map((mod) => mod.id),
    );

    // --------------------------------------------------
    // MODS CANDIDATOS
    // --------------------------------------------------

    const candidates = await prisma.mod.findMany({
      where: {
        gameId,
        gameVersionId,
        status: "APPROVED",
        deletedAt: null,

        id: {
          notIn: selectedModIds,
        },

        categories: {
          some: {
            categoryId,
          },
        },
      },

      select: {
        id: true,
        name: true,
        version: true,

        categories: {
          select: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },

        dependencies: {
          select: {
            dependency: {
              select: {
                id: true,
                name: true,
                version: true,
              },
            },
          },
        },

        incompatibilities: {
          select: {
            incompatible: {
              select: {
                id: true,
                name: true,
                version: true,
              },
            },
          },
        },
      },

      take: 30,
    });

    // --------------------------------------------------
    // NO HAY CANDIDATOS
    // --------------------------------------------------

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No hay mods con esa categoría." },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // MAPA DE CANDIDATOS
    // --------------------------------------------------

    const candidateMap = new Map(
      candidates.map((mod) => [mod.id, mod]),
    );

    // --------------------------------------------------
    // PREPARAR DATOS PARA LA IA
    // --------------------------------------------------

    const selectedData = selectedMods.map((mod) => ({
      id: mod.id,
      name: mod.name,
      version: mod.version,

      categories: mod.categories.map(
        (item) => item.category.name,
      ),

      dependencies: mod.dependencies.map(
        (item) => ({
          id: item.dependency.id,
          name: item.dependency.name,
          version: item.dependency.version,
        }),
      ),

      incompatibilities:
        mod.incompatibilities.map(
          (item) => ({
            id: item.incompatible.id,
            name: item.incompatible.name,
            version: item.incompatible.version,
          }),
        ),
    }));

    const candidateData = candidates.map((mod) => ({
      id: mod.id,
      name: mod.name,
      version: mod.version,

      categories: mod.categories.map(
        (item) => item.category.name,
      ),

      dependencies: mod.dependencies.map(
        (item) => ({
          id: item.dependency.id,
          name: item.dependency.name,
          version: item.dependency.version,
        }),
      ),

      incompatibilities:
        mod.incompatibilities.map(
          (item) => ({
            id: item.incompatible.id,
            name: item.incompatible.name,
            version: item.incompatible.version,
          }),
        ),
    }));

    // --------------------------------------------------
    // PROMPT (ACTUALIZADO PARA EVITAR CONFUSIÓN DE IDs)
    // --------------------------------------------------

    const prompt = `
Sos un asistente que recomienda mods para un modpack.

DATOS DEL MODPACK:
Juego: ${gameId}
Versión del juego: ${gameVersion.version}
Categoría solicitada: ${category.name}

MODS YA SELECCIONADOS:
${JSON.stringify(selectedData, null, 2)}

CANDIDATOS DISPONIBLES:
${JSON.stringify(candidateData, null, 2)}

REGLAS IMPORTANTES:
1. Solo podés recomendar mods que aparezcan en CANDIDATOS DISPONIBLES.
2. No inventes mods, no inventes IDs.
3. No recomiendes mods que ya estén seleccionados.
4. No recomiendes mods incompatibles con los mods seleccionados (revisá las dependencias e incompatibilidades).
5. Elegí solamente los candidatos que tengan sentido para la categoría solicitada y que puedan complementar el modpack.
6. Como máximo devolvé 5 sugerencias.
7. El campo "reason" debe explicar al usuario por qué el mod puede ser útil, usando el NOMBRE del mod.
8. NUNCA coloques IDs internos dentro de "reason".
9. REGLA CRÍTICA: En el campo "modId" DEBÉS colocar EXACTAMENTE el valor del campo "id" (el UUID largo) que aparece en el JSON de CANDIDATOS DISPONIBLES. Si no usas el "id" exacto, el sistema fallará.
10. La respuesta debe ser únicamente JSON válido, sin bloques de código markdown (no uses \`\`\`json).

Estructura obligatoria:
{
  "suggestions": [
    {
      "modId": "EL_UUID_EXACTO_DEL_CANDIDATO",
      "reason": "Explicación usando solo nombres legibles"
    }
  ]
}
`;

    // --------------------------------------------------
    // LLAMAR A LOS PROVEEDORES DE IA
    // --------------------------------------------------

    let aiResult;

    try {
      aiResult = await generateSuggestions(prompt);
    } catch (error) {
      console.error("Error de todos los proveedores de IA:", error);
      return NextResponse.json(
        { error: "No se pudieron generar sugerencias en este momento. Intentá nuevamente más tarde." },
        { status: 502 },
      );
    }

    console.log(`Sugerencias generadas utilizando ${aiResult.provider}.`);

    // --------------------------------------------------
    // LIMPIAR Y PARSEAR RESPUESTA DE LA IA
    // --------------------------------------------------

    let aiData: AIResponse;

    try {
      // FIX: Limpiamos los bloques de markdown que las IAs suelen agregar rebeldes.
      const cleanJsonText = aiResult.text
        .replace(/```json\n?/gi, "")
        .replace(/```/gi, "")
        .trim();
        
      // DEBUG: Muestra exactamente qué devolvió la IA antes del filtro
      console.log("=== RAW AI TEXT ===", cleanJsonText);

      aiData = JSON.parse(cleanJsonText);
    } catch (error) {
      console.error(`La respuesta de ${aiResult.provider} no es JSON válido:`, aiResult.text, error);
      return NextResponse.json(
        { error: "La IA devolvió una respuesta con un formato inválido." },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // VALIDAR RESPUESTA DE LA IA
    // --------------------------------------------------

    const rawSuggestions = Array.isArray(aiData?.suggestions) ? aiData.suggestions : [];

    const validSuggestions = rawSuggestions
      .filter((suggestion): suggestion is AISuggestion => {
        const isValidStructure = typeof suggestion?.modId === "string" && typeof suggestion?.reason === "string";
        if (!isValidStructure) console.log("Filtro: Estructura inválida", suggestion);
        return isValidStructure;
      })
      .filter((suggestion) => {
        const exists = candidateMap.has(suggestion.modId);
        // DEBUG: Si esto imprime false, la IA puso un Nombre en vez del UUID.
        if (!exists) console.log("Filtro: modId no existe en candidateMap:", suggestion.modId);
        return exists;
      })
      .filter((suggestion) => {
        const notSelected = !selectedSet.has(suggestion.modId);
        if (!notSelected) console.log("Filtro: El mod ya estaba seleccionado:", suggestion.modId);
        return notSelected;
      })
      .filter((suggestion) => {
        const candidate = candidateMap.get(suggestion.modId);
        if (!candidate) return false;

        const candidateIncompatibilities = new Set(candidate.incompatibilities.map((item) => item.incompatible.id));

        for (const selected of selectedMods) {
          const selectedIncompatibilities = new Set(selected.incompatibilities.map((item) => item.incompatible.id));

          if (candidateIncompatibilities.has(selected.id) || selectedIncompatibilities.has(candidate.id)) {
            console.log("Filtro: Incompatibilidad detectada entre", candidate.name, "y", selected.name);
            return false;
          }
        }
        return true;
      })
      .slice(0, 5);

    // DEBUG: Verifica cuántas pasaron tus filtros
    console.log("=== SUGERENCIAS QUE PASARON LOS FILTROS ===", validSuggestions);

    // --------------------------------------------------
    // FORMATO FINAL PARA EL FRONTEND
    // --------------------------------------------------

    const suggestions = validSuggestions
      .map((suggestion) => {
        const mod = candidateMap.get(suggestion.modId);
        if (!mod) return null;

        return {
          id: mod.id,
          name: mod.name,
          version: mod.version,
          reason: suggestion.reason,
          categories: mod.categories.map((item) => item.category.name),
        };
      })
      .filter((suggestion): suggestion is NonNullable<typeof suggestion> => suggestion !== null);

    if (suggestions.length === 0) {
      return NextResponse.json(
        { error: "No hay mods con esa categoría compatibles con tu modpack." },
        { status: 404 }  
      );
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error en /api/modpacks/suggestions:", error);
    return NextResponse.json(
      { error: "Ocurrió un error al generar las sugerencias." },
      { status: 500 },
    );
  }
}