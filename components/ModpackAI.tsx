"use client";

import { useState } from "react";

interface Category {
  id: string;
  name: string;
}

interface Report {
  summary: string;
  compatible: boolean;
  warnings: string[];
  missingDependencies: Array<{
    modId: string;
    dependencyId: string;
    reason: string;
  }>;
  incompatibilities: Array<{
    modAId: string;
    modBId: string;
    reason: string;
  }>;
  recommendations: string[];
}

interface Suggestion {
  id: string;
  name: string;
  version: string;
  reason: string;
  categories: string[];
}

interface Props {
  gameId?: string;
  gameVersionId?: string;
  categories: Category[];
}

export default function ModpackAI({
  gameId,
  gameVersionId,
  categories,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState("");

  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [report, setReport] = useState<Report | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [error, setError] = useState("");

  // ==================================================
  // Obtener mods seleccionados
  // ==================================================

  function getSelectedModIds(): string[] {
    return Array.from(
      document.querySelectorAll<HTMLInputElement>(
        'input[name="modIds"]:checked'
      )
    ).map((input) => input.value);
  }

  // ==================================================
  // Analizar modpack
  // ==================================================

  async function analyzeModpack() {
    setError("");
    setReport(null);

    if (!gameId || !gameVersionId) {
      setError(
        "Selecciona un juego y una versión antes de analizar."
      );
      return;
    }

    const modIds = getSelectedModIds();

    if (modIds.length === 0) {
      setError(
        "Selecciona al menos un mod antes de analizar."
      );
      return;
    }

    setLoadingAnalysis(true);

    try {
      const response = await fetch(
        "/api/modpacks/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gameId,
            gameVersionId,
            modIds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudo analizar el modpack."
        );
      }

      setReport({
        summary: data.report?.summary ?? "No se recibió un resumen.",
        compatible: data.report?.compatible ?? true,
        warnings: Array.isArray(data.report?.warnings)
          ? data.report.warnings
          : [],
        missingDependencies: Array.isArray(
          data.report?.missingDependencies
        )
          ? data.report.missingDependencies
          : [],
        incompatibilities: Array.isArray(
          data.report?.incompatibilities
        )
          ? data.report.incompatibilities
          : [],
        recommendations: Array.isArray(
          data.report?.recommendations
        )
          ? data.report.recommendations
          : [],
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al analizar el modpack."
      );
    } finally {
      setLoadingAnalysis(false);
    }
  }

  // ==================================================
  // Obtener sugerencias
  // ==================================================

  async function getSuggestions() {
    setError("");
    setSuggestions([]);

    if (!gameId || !gameVersionId) {
      setError(
        "Selecciona un juego y una versión antes de pedir sugerencias."
      );
      return;
    }

    if (!selectedCategory) {
      setError(
        "Selecciona una categoría para obtener sugerencias."
      );
      return;
    }

    const modIds = getSelectedModIds();

    setLoadingSuggestions(true);

    try {
      const response = await fetch(
        "/api/modpacks/sugestions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gameId,
            gameVersionId,
            categoryId: selectedCategory,
            modIds,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudieron obtener sugerencias."
        );
      }

      setSuggestions(
        Array.isArray(data.suggestions)
          ? data.suggestions
          : []
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al obtener sugerencias."
      );
    } finally {
      setLoadingSuggestions(false);
    }
  }

  // ==================================================
  // Agregar sugerencia
  // ==================================================

  function addSuggestion(modId: string) {
    const checkbox =
      document.querySelector<HTMLInputElement>(
        `input[name="modIds"][value="${modId}"]`
      );

    if (!checkbox) {
      return;
    }

    checkbox.checked = true;

    setSuggestions((current) =>
      current.filter(
        (suggestion) => suggestion.id !== modId
      )
    );
  }

  return (
    <section className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
      {/* ==================================================
          TÍTULO
      ================================================== */}

      <div className="mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Asistente de IA
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Analiza los mods seleccionados y encuentra
          recomendaciones compatibles.
        </p>
      </div>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="mb-5 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ==================================================
          ANÁLISIS
      ================================================== */}

      <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Analizar modpack
            </h4>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Comprueba dependencias e incompatibilidades
              entre los mods seleccionados.
            </p>
          </div>

          <button
            type="button"
            onClick={analyzeModpack}
            disabled={
              loadingAnalysis ||
              !gameId ||
              !gameVersionId
            }
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {loadingAnalysis
              ? "Analizando..."
              : "🤖 Analizar modpack"}
          </button>
        </div>
      </div>

      {/* ==================================================
          RESULTADO DEL ANÁLISIS
      ================================================== */}

      {report && (
        <div className="mt-5 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Resultado del análisis
            </h4>

            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                report.compatible
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                  : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
              }`}
            >
              {report.compatible
                ? "Compatible"
                : "Incompatible"}
            </span>
          </div>

          {/* Resumen */}

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-5">
            {report.summary}
          </p>

          {/* Dependencias faltantes */}

          {report.missingDependencies.length > 0 && (
            <div className="mb-5">
              <h5 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                Dependencias faltantes
              </h5>

              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {report.missingDependencies.map(
                  (item, index) => (
                    <li key={`${item.modId}-${item.dependencyId}-${index}`}>
                      {item.reason}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Incompatibilidades */}

          {report.incompatibilities.length > 0 && (
            <div className="mb-5">
              <h5 className="font-medium text-red-700 dark:text-red-300 mb-2">
                Incompatibilidades
              </h5>

              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {report.incompatibilities.map(
                  (item, index) => (
                    <li
                      key={`${item.modAId}-${item.modBId}-${index}`}
                    >
                      {item.reason}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Advertencias */}

          {report.warnings.length > 0 && (
            <div className="mb-5">
              <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Advertencias
              </h5>

              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {report.warnings.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}

          {/* Recomendaciones del análisis */}

          {report.recommendations.length > 0 && (
            <div>
              <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Recomendaciones
              </h5>

              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {report.recommendations.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ==================================================
          SUGERENCIAS
      ================================================== */}

      <div className="mt-6 p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <h4 className="font-semibold text-gray-900 dark:text-white">
          Sugerir mods
        </h4>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
          Selecciona una categoría y la IA buscará mods
          disponibles que puedan complementar tu modpack.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedCategory}
            onChange={(event) =>
              setSelectedCategory(event.target.value)
            }
            className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">
              Seleccionar categoría
            </option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={getSuggestions}
            disabled={
              loadingSuggestions ||
              !gameId ||
              !gameVersionId ||
              !selectedCategory
            }
            className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 dark:bg-white dark:hover:bg-gray-200 dark:text-gray-900 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            {loadingSuggestions
              ? "Buscando..."
              : "✨ Sugerir mods"}
          </button>
        </div>
      </div>

      {/* ==================================================
          RESULTADOS DE SUGERENCIAS
      ================================================== */}

      {suggestions.length > 0 && (
        <div className="mt-5 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            Mods recomendados
          </h4>

          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="font-medium text-gray-900 dark:text-white">
                    {suggestion.name}
                  </h5>

                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    v{suggestion.version}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {suggestion.reason}
                </p>

                {suggestion.categories.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {suggestion.categories.map(
                      (category) => (
                        <span
                          key={category}
                          className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        >
                          {category}
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  addSuggestion(suggestion.id)
                }
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                + Agregar
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestions.length === 0 &&
        !loadingSuggestions &&
        selectedCategory && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Las sugerencias aparecerán aquí.
          </p>
        )}
    </section>
  );
}