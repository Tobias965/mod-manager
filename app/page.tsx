import Link from "next/link";

import { prisma } from "@/lib/prisma";

// ==================================================
// PÁGINA PRINCIPAL
// ==================================================

export default async function HomePage() {
  const games = await prisma.game.findMany({
    where: {
      deletedAt: null,
    },
    include: {
      versions: {
        orderBy: {
          version: "asc",
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">

        {/* CABECERA */}

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900">
            Mod Manager
          </h1>

          <p className="mt-2 text-gray-600">
            Explora juegos, versiones y mods disponibles.
          </p>
        </div>

        {/* SIN JUEGOS */}

        {games.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">
              No hay juegos registrados.
            </p>
          </div>
        ) : (

          /* JUEGOS */

          <div className="space-y-6">
            {games.map((game) => (
              <section
                key={game.id}
                className="rounded-lg bg-white p-6 shadow-md"
              >

                {/* JUEGO */}

                <div className="mb-5">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {game.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {game.versions.length}{" "}
                    {game.versions.length === 1
                      ? "versión registrada"
                      : "versiones registradas"}
                  </p>
                </div>

                {/* VERSIONES */}

                {game.versions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Este juego no tiene versiones registradas.
                  </p>
                ) : (
                  <details className="rounded-md border border-gray-200">
                    <summary className="cursor-pointer px-4 py-3 font-medium text-gray-900 hover:bg-gray-50">
                      Ver versiones
                    </summary>

                    <div className="border-t border-gray-200 p-3">
                      <div className="space-y-2">
                        {game.versions.map((gameVersion) => (
                          <Link
                            key={gameVersion.id}
                            href={`/games/${game.id}/versions/${gameVersion.id}`}
                            className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50"
                          >
                            <span className="text-sm font-medium text-gray-800">
                              Versión {gameVersion.version}
                            </span>

                            <span className="text-sm font-medium text-blue-600">
                              Ver mods →
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </details>
                )}

              </section>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}