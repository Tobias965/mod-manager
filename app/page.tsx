import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const games = await prisma.game.findMany({
    include: {
      mods: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">
              Mod Manager
            </h1>

            <p className="mt-2 text-gray-600">
              Explora juegos y mods disponibles.
            </p>
          </div>

          <div className="flex gap-3">
            <a
              href="/login"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 font-medium hover:bg-gray-50"
            >
              Iniciar sesión
            </a>

            <a
              href="/register"
              className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Registrarse
            </a>
          </div>
        </div>

        {games.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">
              No hay juegos registrados.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {games.map((game) => (
              <div
                key={game.id}
                className="rounded-lg bg-white p-6 shadow-md"
              >
                <h2 className="text-2xl font-bold">
                  {game.name}
                </h2>

                <div className="mt-2 flex gap-2 text-sm">
                  <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">
                    {game.loader}
                  </span>

                  <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                    {game.version}
                  </span>
                </div>

                <h3 className="mt-6 mb-3 font-semibold">
                  Mods disponibles
                </h3>

                {game.mods.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No hay mods registrados.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {game.mods.map((mod) => (
                      <div
                        key={mod.id}
                        className="rounded-md border border-gray-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {mod.name}
                          </span>

                          <span className="text-sm text-gray-500">
                            v{mod.version}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}