import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

async function getUserModpacks(userId: string) {
  return await prisma.modpack.findMany({
    where: { userId },
    include: {
      mods: {
        include: {
          mod: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Replicamos la función para leer la cookie correcta ("session")
async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) return null;

  try {
    const payload = await verifyToken(token);
    return payload; // Asegúrate de que tu verifyToken retorna un objeto con { userId, role }
  } catch (error) {
    console.error("Error verificando el token:", error);
    return null;
  }
}

export default async function MyModpacksPage() {
  const session = await getUser();

  // Si no hay sesión válida, redirigimos al login
  if (!session) {
    redirect("/login");
  }

  const modpacks = await getUserModpacks(session.userId);
  const canCreate = session.role === "CREATOR" || session.role === "ADMIN" || session.role === "USER";

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      {/* Header y Botón para Crear */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Mis Modpacks
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tus modpacks públicos y privados.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/modpacks"
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium text-sm"
          >
            Volver a Modpacks
          </Link>

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
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Aún no has creado ningún modpack.
          </p>
          {canCreate && (
            <Link
              href="/modpacks/create"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              Crear tu primer modpack
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modpacks.map((modpack) => (
            <div
              key={modpack.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                    {modpack.name}
                  </h2>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      modpack.isPublic
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {modpack.isPublic ? "Público" : "Privado"}
                  </span>
                </div>

                <div className="mb-4 mt-3">
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