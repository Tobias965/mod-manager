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
      return NextResponse.json({
        suggestions: [],
        message:
          "No hay otros mods aprobados disponibles en esta categoría para la versión seleccionada.",
      });
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
    // PROMPT
    // --------------------------------------------------

    const prompt = `
Sos un asistente que recomienda mods para un modpack.

DATOS DEL MODPACK:

Juego:
${gameId}

Versión del juego:
${gameVersion.version}

Categoría solicitada:
${category.name}

MODS YA SELECCIONADOS:

${JSON.stringify(selectedData, null, 2)}

CANDIDATOS DISPONIBLES:

${JSON.stringify(candidateData, null, 2)}

REGLAS IMPORTANTES:

1. Solo podés recomendar mods que aparezcan en CANDIDATOS DISPONIBLES.

2. No inventes mods.

3. No inventes IDs.

4. No recomiendes mods que ya estén seleccionados.

5. No recomiendes mods incompatibles con los mods seleccionados.

6. Tené en cuenta las dependencias de los mods.

7. Todos los candidatos ya pertenecen al mismo juego y versión.

8. Si no hay mods seleccionados, igualmente debés analizar los candidatos usando la categoría solicitada.

9. Elegí solamente los candidatos que tengan sentido para la categoría solicitada y que puedan complementar el modpack.

10. Como máximo devolvé 5 sugerencias.

11. El campo "reason" debe explicar al usuario por qué el mod puede ser útil.

12. Nunca coloques IDs internos dentro de "reason".

13. No menciones información técnica interna de la base de datos.

14. La respuesta debe ser únicamente JSON válido.

15. La respuesta debe tener exactamente esta estructura:

{
  "suggestions": [
    {
      "modId": "ID_DEL_MOD",
      "reason": "Explicación para el usuario"
    }
  ]
}

IMPORTANTE:

Los IDs son únicamente para identificar internamente los mods.

Nunca muestres IDs internos dentro de "reason".

No agregues campos adicionales.
`;

    // --------------------------------------------------
    // LLAMAR A LOS PROVEEDORES DE IA
    // --------------------------------------------------

    let aiResult;

    try {
      aiResult = await generateSuggestions(prompt);
    } catch (error) {
      console.error(
        "Error de todos los proveedores de IA:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron generar sugerencias en este momento. Intentá nuevamente más tarde.",
        },
        { status: 502 },
      );
    }

    console.log(
      `Sugerencias generadas utilizando ${aiResult.provider}.`,
    );

    // --------------------------------------------------
    // PARSEAR RESPUESTA DE LA IA
    // --------------------------------------------------

    let aiData: AIResponse;

    try {
      aiData = JSON.parse(aiResult.text);
    } catch (error) {
      console.error(
        `La respuesta de ${aiResult.provider} no es JSON válido:`,
        aiResult.text,
        error,
      );

      return NextResponse.json(
        {
          error:
            "La IA devolvió una respuesta con un formato inválido.",
        },
        { status: 502 },
      );
    }

    // --------------------------------------------------
    // VALIDAR RESPUESTA DE LA IA
    // --------------------------------------------------

    const rawSuggestions = Array.isArray(
      aiData?.suggestions,
    )
      ? aiData.suggestions
      : [];

    const validSuggestions = rawSuggestions
      // -----------------------------------------------
      // La sugerencia debe tener la estructura correcta
      // -----------------------------------------------
      .filter(
        (
          suggestion,
        ): suggestion is AISuggestion =>
          typeof suggestion?.modId === "string" &&
          typeof suggestion?.reason === "string",
      )

      // -----------------------------------------------
      // El mod debe existir entre los candidatos
      // -----------------------------------------------
      .filter((suggestion) =>
        candidateMap.has(suggestion.modId),
      )

      // -----------------------------------------------
      // No puede ser uno ya seleccionado
      // -----------------------------------------------
      .filter(
        (suggestion) =>
          !selectedSet.has(suggestion.modId),
      )

      // -----------------------------------------------
      // Validar incompatibilidades
      // -----------------------------------------------
      .filter((suggestion) => {
        const candidate = candidateMap.get(
          suggestion.modId,
        );

        if (!candidate) {
          return false;
        }

        const candidateIncompatibilities =
          new Set(
            candidate.incompatibilities.map(
              (item) => item.incompatible.id,
            ),
          );

        for (const selected of selectedMods) {
          const selectedIncompatibilities =
            new Set(
              selected.incompatibilities.map(
                (item) => item.incompatible.id,
              ),
            );

          // El candidato declara incompatible
          // al mod seleccionado.
          if (
            candidateIncompatibilities.has(
              selected.id,
            )
          ) {
            return false;
          }

          // El mod seleccionado declara
          // incompatible al candidato.
          if (
            selectedIncompatibilities.has(
              candidate.id,
            )
          ) {
            return false;
          }
        }

        return true;
      })

      // -----------------------------------------------
      // Máximo 5 sugerencias
      // -----------------------------------------------
      .slice(0, 5);

    // --------------------------------------------------
    // FORMATO FINAL PARA EL FRONTEND
    // --------------------------------------------------

    const suggestions = validSuggestions
      .map((suggestion) => {
        const mod = candidateMap.get(
          suggestion.modId,
        );

        if (!mod) {
          return null;
        }

        return {
          id: mod.id,
          name: mod.name,
          version: mod.version,
          reason: suggestion.reason,
          categories: mod.categories.map(
            (item) => item.category.name,
          ),
        };
      })
      .filter(
        (
          suggestion,
        ): suggestion is NonNullable<
          typeof suggestion
        > => suggestion !== null,
      );

    // --------------------------------------------------
    // NO HAY SUGERENCIAS VÁLIDAS
    // --------------------------------------------------

    if (suggestions.length === 0) {
      return NextResponse.json({
        suggestions: [],
        message:
          "No se encontraron otros mods compatibles con el modpack para esta categoría y versión.",
      });
    }

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    return NextResponse.json({
      suggestions,
    });
  } catch (error) {
    console.error(
      "Error en /api/modpacks/suggestions:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al generar las sugerencias.",
      },
      { status: 500 },
    );
  }
}
