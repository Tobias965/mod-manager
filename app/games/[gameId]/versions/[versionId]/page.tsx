import Link from "next/link";
import { prisma } from "@/lib/prisma";

// ==================================================
// PÁGINA DE MODS POR VERSIÓN
// ==================================================

type PageProps = {
  params: Promise<{
    gameId: string;
    versionId: string;
  }>;
  searchParams: Promise<{
    search?: string;
    category?: string;
  }>;
};

export default async function GameVersionPage({
  params,
  searchParams,
}: PageProps) {
  const { gameId, versionId } = await params;
  const { search, category } = await searchParams;

  const searchText = search?.trim() || "";
  const categoryId = category || "";

  // ==================================================
  // JUEGO Y VERSIÓN
  // ==================================================

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      deletedAt: null,
    },
    include: {
      versions: {
        where: {
          id: versionId,
        },
      },
    },
  });

  if (!game || game.versions.length === 0) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <h1 className="text-xl font-bold text-gray-900">
              Versión no encontrada
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              El juego o la versión seleccionada no existe.
            </p>

            <Link
              href="/"
              className="mt-5 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              ← Volver a los juegos
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const gameVersion = game.versions[0];

  // ==================================================
  // MODS
  // ==================================================

  const mods = await prisma.mod.findMany({
    where: {
      gameId,
      gameVersionId: versionId,
      status: "APPROVED",
      deletedAt: null, // <--- Filtrar borrado lógico

      ...(searchText
        ? {
            name: {
              contains: searchText,
              mode: "insensitive",
            },
          }
        : {}),

      ...(categoryId
        ? {
            categories: {
              some: {
                categoryId,
              },
            },
          }
        : {}),
    },

    include: {
      categories: {
        include: {
          category: true,
        },
      },
    },

    orderBy: {
      name: "asc",
    },
  });

  // ==================================================
  // CATEGORÍAS
  // ==================================================

  const categories = await prisma.category.findMany({
    where: {
      mods: {
        some: {
          mod: {
            gameId,
            gameVersionId: versionId,
            status: "APPROVED",
            deletedAt: null,
          },
        },
      },
    },

    orderBy: {
      name: "asc",
    },
  });

  // ==================================================
  // VISTA
  // ==================================================

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* ==================================================
            NAVEGACIÓN
            ================================================== */}

        <div className="mb-5">
          <Link
            href="/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver a los juegos
          </Link>
        </div>

        {/* ==================================================
            CABECERA
            ================================================== */}

        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <p className="text-sm text-gray-500">{game.name}</p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Versión {gameVersion.version}
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Explora los mods disponibles para esta versión.
          </p>
        </div>

        {/* ==================================================
            BUSCADOR Y FILTRO
            ================================================== */}

        <div className="mb-6 rounded-lg bg-white p-5 shadow-md">
          <form
            method="GET"
            className="grid gap-4 md:grid-cols-[1fr_250px_auto]"
          >
            {/* BUSCADOR */}

            <div>
              <label
                htmlFor="search"
                className="mb-1.5 block text-sm font-medium text-gray-900"
              >
                Buscar mod
              </label>

              <input
                id="search"
                name="search"
                type="search"
                defaultValue={searchText}
                placeholder="Buscar por nombre..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* CATEGORÍA */}

            <div>
              <label
                htmlFor="category"
                className="mb-1.5 block text-sm font-medium text-gray-900"
              >
                Categoría
              </label>

              <select
                id="category"
                name="category"
                defaultValue={categoryId}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todas las categorías</option>

                {categories.map((categoryItem) => (
                  <option
                    key={categoryItem.id}
                    value={categoryItem.id}
                  >
                    {categoryItem.name}
                  </option>
                ))}
              </select>
            </div>

            {/* BOTÓN */}

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 md:w-auto"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* ==================================================
            RESULTADOS
            ================================================== */}

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Mods disponibles
          </h2>

          <span className="text-sm text-gray-500">
            {mods.length} {mods.length === 1 ? "mod" : "mods"}
          </span>
        </div>

        {/* ==================================================
            SIN RESULTADOS
            ================================================== */}

        {mods.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">
              No se encontraron mods para esta búsqueda.
            </p>

            {(searchText || categoryId) && (
              <Link
                href={`/games/${gameId}/versions/${versionId}`}
                className="mt-3 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Limpiar filtros
              </Link>
            )}
          </div>
        ) : (
          /* ==================================================
             LISTA DE MODS
             ================================================== */

          <div className="space-y-4">
            {mods.map((mod) => (
              <div
                key={mod.id}
                className="rounded-lg bg-white p-5 shadow-md"
              >
                {/* INFORMACIÓN PRINCIPAL */}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {mod.name}
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Versión del mod: {mod.version}
                    </p>
                  </div>

                  {mod.license && (
                    <span className="w-fit rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      {mod.license}
                    </span>
                  )}
                </div>

                {/* CATEGORÍAS */}

                {mod.categories.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mod.categories.map((modCategory) => (
                      <span
                        key={`${mod.id}-${modCategory.categoryId}`}
                        className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
                      >
                        {modCategory.category.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* ==================================================
                    FUENTE / DESCARGA
                    ================================================== */}

                <div className="mt-4">
                  {mod.externalUrl ? (
                    // ----------------------------------------------
                    // MOD EXTERNO
                    // ----------------------------------------------

                    <Link
                      href={mod.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Ver fuente del mod →
                    </Link>
                  ) : mod.storageKey ? (
                    // ----------------------------------------------
                    // MOD ALMACENADO EN SUPABASE
                    // ----------------------------------------------

                    <Link
                      href={`/api/mods/${mod.id}/download`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Descargar mod →
                    </Link>
                  ) : (
                    // ----------------------------------------------
                    // SIN ARCHIVO
                    // ----------------------------------------------

                    <span className="text-sm text-gray-500">
                      Archivo no disponible
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}