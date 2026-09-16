import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

interface SuggestionsRequest {
  gameId?: string;
  gameVersionId?: string;
  categoryId?: string;
  modIds?: string[];
}

interface Suggestion {
  modId: string;
  reason: string;
}

export async function POST(req: Request) {
  try {
    // ==================================================
    // 1. Verificar sesión
    // ==================================================

    const cookieStore = await cookies();

    const token =
      cookieStore.get("session")?.value;

    if (!token) {
      return NextResponse.json(
        {
          error: "No autenticado",
        },
        {
          status: 401,
        }
      );
    }

    try {
      await verifyToken(token);
    } catch {
      return NextResponse.json(
        {
          error: "Sesión inválida",
        },
        {
          status: 401,
        }
      );
    }

    // ==================================================
    // 2. Leer datos
    // ==================================================

    const body =
      (await req.json()) as SuggestionsRequest;

    const gameId = String(
      body.gameId ?? ""
    ).trim();

    const gameVersionId = String(
      body.gameVersionId ?? ""
    ).trim();

    const categoryId = String(
      body.categoryId ?? ""
    ).trim();

    const selectedModIds = Array.isArray(
      body.modIds
    )
      ? [
          ...new Set(
            body.modIds.filter(
              (id): id is string =>
                typeof id === "string" &&
                id.trim() !== ""
            )
          ),
        ]
      : [];

    if (!gameId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar un juego",
        },
        {
          status: 400,
        }
      );
    }

    if (!gameVersionId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar una versión",
        },
        {
          status: 400,
        }
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar una categoría",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // 3. Verificar juego y versión
    // ==================================================

    const gameVersion =
      await prisma.gameVersion.findFirst({
        where: {
          id: gameVersionId,
          gameId,
        },

        select: {
          id: true,
          version: true,

          game: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    if (!gameVersion) {
      return NextResponse.json(
        {
          error:
            "La versión seleccionada no pertenece al juego",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // 4. Verificar categoría
    // ==================================================

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
            "La categoría seleccionada no existe",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // 5. Obtener mods actualmente seleccionados
    // ==================================================

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
                    },
                  },
                },
              },

              incompatibleWith: {
                select: {
                  mod: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },

            orderBy: {
              name: "asc",
            },
          })
        : [];

    if (
      selectedMods.length !==
      selectedModIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "Uno o más mods seleccionados no son válidos",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // 6. Obtener candidatos
    // ==================================================

    const candidates =
      await prisma.mod.findMany({
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
                  status: true,
                  deletedAt: true,
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
                },
              },
            },
          },

          incompatibleWith: {
            select: {
              mod: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },

        orderBy: {
          name: "asc",
        },

        take: 30,
      });

    if (candidates.length === 0) {
      return NextResponse.json({
        game: gameVersion.game,
        version: gameVersion.version,
        category,
        suggestions: [],
        message:
          "No hay mods aprobados disponibles en esta categoría para la versión seleccionada.",
      });
    }

    // ==================================================
    // 7. Preparar información para Gemini
    // ==================================================

    const selectedData =
      selectedMods.map((mod) => ({
        id: mod.id,
        name: mod.name,
        version: mod.version,

        categories:
          mod.categories.map(
            (item) => item.category.name
          ),

        dependencies:
          mod.dependencies.map(
            (item) => ({
              id: item.dependency.id,
              name: item.dependency.name,
            })
          ),

        incompatibilities: [
          ...mod.incompatibilities.map(
            (item) => ({
              id: item.incompatible.id,
              name: item.incompatible.name,
            })
          ),

          ...mod.incompatibleWith.map(
            (item) => ({
              id: item.mod.id,
              name: item.mod.name,
            })
          ),
        ],
      }));

    const candidateData =
      candidates.map((mod) => ({
        id: mod.id,
        name: mod.name,
        version: mod.version,

        categories:
          mod.categories.map(
            (item) => item.category.name
          ),

        dependencies:
          mod.dependencies.map(
            (item) => ({
              id: item.dependency.id,
              name: item.dependency.name,
              version:
                item.dependency.version,
              status:
                item.dependency.status,
              deleted:
                item.dependency.deletedAt !==
                null,
            })
          ),

        incompatibilities: [
          ...mod.incompatibilities.map(
            (item) => ({
              id: item.incompatible.id,
              name: item.incompatible.name,
            })
          ),

          ...mod.incompatibleWith.map(
            (item) => ({
              id: item.mod.id,
              name: item.mod.name,
            })
          ),
        ],
      }));

    // ==================================================
    // 8. Gemini
    // ==================================================

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY no está configurada en el servidor",
        },
        {
          status: 500,
        }
      );
    }

    const model =
      process.env.GEMINI_MODEL ??
      "gemini-2.5-flash";

    const prompt = `
Eres el asistente de recomendaciones de ModVault.

El usuario está creando un modpack para:

Juego: ${gameVersion.game.name}
Versión: ${gameVersion.version}

Categoría solicitada:
${category.name}

MODS QUE YA TIENE EL USUARIO:
${JSON.stringify(
  selectedData,
  null,
  2
)}

MODS DISPONIBLES PARA RECOMENDAR:
${JSON.stringify(
  candidateData,
  null,
  2
)}

Tu tarea es seleccionar hasta 5 mods de la lista "MODS DISPONIBLES PARA RECOMENDAR".

REGLAS:

1. SOLO puedes recomendar mods que aparezcan en la lista de candidatos.
2. Utiliza exactamente el id proporcionado por la base de datos.
3. No inventes nombres ni IDs.
4. No recomiendes mods que ya estén seleccionados.
5. Evita recomendar un mod si sus incompatibilidades indican que entra en conflicto con alguno de los mods actuales.
6. Ten en cuenta las dependencias.
7. Prioriza mods que tengan sentido junto con los mods actuales.
8. Explica brevemente por qué cada mod podría complementar el modpack.
9. Si no existe ningún candidato razonable, devuelve una lista vacía.
10. Devuelve únicamente JSON válido.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },

        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],

          generationConfig: {
            responseMimeType:
              "application/json",

            responseSchema: {
              type: "OBJECT",

              properties: {
                suggestions: {
                  type: "ARRAY",

                  items: {
                    type: "OBJECT",

                    properties: {
                      modId: {
                        type: "STRING",
                      },

                      reason: {
                        type: "STRING",
                      },
                    },

                    required: [
                      "modId",
                      "reason",
                    ],
                  },
                },
              },

              required: [
                "suggestions",
              ],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "Gemini suggestions error:",
        errorText
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron generar sugerencias",
        },
        {
          status: 502,
        }
      );
    }

    const geminiData =
      await response.json();

    const text =
      geminiData?.candidates?.[0]?.content
        ?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        {
          error:
            "La IA no devolvió sugerencias válidas",
        },
        {
          status: 502,
        }
      );
    }

    let parsed: {
      suggestions?: Suggestion[];
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      console.error(
        "JSON inválido de Gemini:",
        text
      );

      return NextResponse.json(
        {
          error:
            "La IA devolvió una respuesta inválida",
        },
        {
          status: 502,
        }
      );
    }

    // ==================================================
    // 9. Validar las sugerencias
    // ==================================================

    const candidateMap = new Map(
      candidates.map((mod) => [
        mod.id,
        mod,
      ])
    );

    const selectedSet = new Set(
      selectedModIds
    );

    const validatedSuggestions: Suggestion[] =
      [];

    const usedSuggestions = new Set<string>();

    for (const suggestion of
      parsed.suggestions ?? []) {
      if (
        typeof suggestion.modId !==
          "string" ||
        typeof suggestion.reason !==
          "string"
      ) {
        continue;
      }

      if (
        usedSuggestions.has(
          suggestion.modId
        )
      ) {
        continue;
      }

      if (
        selectedSet.has(
          suggestion.modId
        )
      ) {
        continue;
      }

      const candidate =
        candidateMap.get(
          suggestion.modId
        );

      if (!candidate) {
        continue;
      }

      // Evitar candidatos con incompatibilidades
      // directas hacia los mods seleccionados.
      const candidateConflicts =
        [
          ...candidate.incompatibilities.map(
            (item) =>
              item.incompatible.id
          ),

          ...candidate.incompatibleWith.map(
            (item) => item.mod.id
          ),
        ];

      const conflictsWithSelected =
        candidateConflicts.some((id) =>
          selectedSet.has(id)
        );

      if (conflictsWithSelected) {
        continue;
      }

      usedSuggestions.add(
        suggestion.modId
      );

      validatedSuggestions.push({
        modId: suggestion.modId,
        reason:
          suggestion.reason.trim(),
      });

      if (
        validatedSuggestions.length >=
        5
      ) {
        break;
      }
    }

    // ==================================================
    // 10. Devolver información completa
    // ==================================================

    return NextResponse.json({
      game: {
        id: gameVersion.game.id,
        name: gameVersion.game.name,
      },

      version: {
        id: gameVersion.id,
        version: gameVersion.version,
      },

      category,

      suggestions:
        validatedSuggestions.map(
          (suggestion) => {
            const mod =
              candidateMap.get(
                suggestion.modId
              )!;

            return {
              id: mod.id,
              name: mod.name,
              version: mod.version,
              reason:
                suggestion.reason,

              categories:
                mod.categories.map(
                  (item) =>
                    item.category.name
                ),
            };
          }
        ),
    });
  } catch (error) {
    console.error(
      "Error generando sugerencias:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al generar las sugerencias",
      },
      {
        status: 500,
      }
    );
  }
}