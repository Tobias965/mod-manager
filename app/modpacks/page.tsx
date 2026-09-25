import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

async function getPublicModpacks() {
  return await prisma.modpack.findMany({
    where: {
      isPublic: true,
      game: { deletedAt: null },
      mods: {
        every: {
          mod: {
            deletedAt: null,
            status: "APPROVED",
          },
        },
      },
    },
    include: {
      user: {
        select: { email: true },
      },
      mods: {
        include: {
          mod: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Función auxiliar para obtener el usuario desde las cookies
async function getUser() {
  const cookieStore = await cookies();
  // ¡CORRECCIÓN AQUÍ! Ahora buscamos "session" en lugar de "token"
  const token = cookieStore.get("session")?.value; 

  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    return payload; // Retorna { userId, role }
  } catch (error) {
    console.error("Error verificando el token:", error);
    return null;
  }
}

export default async function ModpacksPage() {
  const user = await getUser();
  const modpacks = await getPublicModpacks();

  const isAuthenticated = Boolean(user);
  const canCreate = user?.role === "CREATOR" || user?.role === "ADMIN" || user?.role === "USER";

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Modpacks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Explora y descarga los modpacks creados por la comunidad.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón para ir a Mis Modpacks (para cualquier usuario logueado) */}
          {isAuthenticated && (
            <Link
              href="/modpacks/me"
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              Mis Modpacks
            </Link>
          )}

          {/* Botón para Crear Modpack (CREATOR o ADMIN) */}
          {canCreate && (
            <Link
              href="/modpacks/create"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
            >
              + Crear Modpack
            </Link>
          )}
        </div>
      </div>

      {/* Listado o Estado Vacío */}
      {modpacks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No hay modpacks disponibles actualmente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modpacks.map((modpack) => (
            <div
              key={modpack.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {modpack.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Creado por{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {modpack.user.email}
                  </span>
                </p>

                <div className="mb-4">
                  <span className="inline-block bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-md mb-2">
                    {modpack.mods.length}{" "}
                    {modpack.mods.length === 1 ? "Mod" : "Mods"}
                  </span>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 line-clamp-3">
                    {modpack.mods.slice(0, 3).map(({ mod }) => (
                      <li key={mod.id} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                        {mod.name}
                      </li>
                    ))}
                    {modpack.mods.length > 3 && (
                      <li className="text-gray-400 italic pl-3">
                        + {modpack.mods.length - 3} mods más...
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              <Link
                href={`/modpacks/${modpack.id}`}
                className="w-full text-center mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-md font-medium text-sm transition-colors"
              >
                Ver Modpack
              </Link>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}