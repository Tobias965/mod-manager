import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ModpackDetailPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Obtener la sesión actual
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  
  let currentUserId: string | null = null;
  if (token) {
    try {
      const session = await verifyToken(token);
      currentUserId = session.userId;
    } catch {
      // Token inválido o expirado
    }
  }

  // 2. Buscar el Modpack con los datos del Mod
  const modpack = await prisma.modpack.findUnique({
    where: { id },
    include: {
      user: {
        select: { email: true }
      },
      game: {
        select: { name: true }
      },
      mods: {
        include: {
          mod: {
            select: { 
              id: true, 
              name: true, 
              version: true,
              storageKey: true,
              externalUrl: true,
              fileName: true
            }
          }
        }
      }
    },
  });

  if (!modpack) {
    notFound();
  }

  // 3. Control de acceso privado
  if (!modpack.isPublic && modpack.userId !== currentUserId) {
    notFound();
  }

  // 4. Separar los mods en Hospedados (Archivo) y Externos (URL)
  const fileMods = modpack.mods.filter((m) => Boolean(m.mod.storageKey));
  const urlMods = modpack.mods.filter((m) => Boolean(m.mod.externalUrl) && !m.mod.storageKey);

  const formattedDate = new Intl.DateTimeFormat("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(modpack.updatedAt));

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Botón de volver */}
      <div className="mb-6">
        <Link
          href="/modpacks"
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-2"
        >
          ← Volver a la lista
        </Link>
      </div>

      {/* Cabecera del Modpack */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-6 right-6">
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold ${
              modpack.isPublic
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {modpack.isPublic ? "Público" : "Privado"}
          </span>
        </div>

        <div className="mb-2">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {modpack.game.name}
          </span>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {modpack.name}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <div className="flex items-center gap-1">
            <span className="font-medium">Creado por:</span>
            <span className="text-gray-900 dark:text-gray-200 font-medium">
              {modpack.user.email}
            </span>
          </div>
          <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div>
            <span className="font-medium">Última actualización: </span>
            {formattedDate}
          </div>
          <div className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div>
            <span className="font-medium">{modpack.mods.length}</span> mods en total
          </div>
        </div>

        {/* Descripción del Modpack */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Descripción
          </h3>
          {modpack.description ? (
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {modpack.description}
            </p>
          ) : (
            <p className="text-gray-500 dark:text-gray-500 italic">
              Este modpack no posee descripción.
            </p>
          )}
        </div>
      </div>

      {/* SECCIÓN DE MODS CONDICIONAL */}
      <div className="space-y-8">
        {modpack.mods.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-8 text-center border border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              No se han añadido mods a este paquete todavía.
            </p>
          </div>
        ) : (
          <>
            {/* 1. SECCIÓN: ARCHIVOS DESCARGABLES (Solo si existen) */}
            {fileMods.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Archivos para descargar
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {fileMods.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fileMods.map(({ mod }) => (
                    <div
                      key={mod.id}
                      className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {mod.name}
                        </h4>
                        {mod.version && (
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            v{mod.version}
                          </span>
                        )}
                      </div>

                      <a
                        href={`/api/mods/${mod.id}/download`}
                        className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                          <path d="M10 12l-5-5h3V3h4v4h3l-5 5zm-7 4h14v2H3v-2z" />
                        </svg>
                        Descargar
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. SECCIÓN: ENLACES EXTERNOS (Solo si existen) */}
            {urlMods.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Enlaces a sitios externos
                  </h2>
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {urlMods.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {urlMods.map(({ mod }) => (
                    <div
                      key={mod.id}
                      className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {mod.name}
                        </h4>
                        {mod.version && (
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                            v{mod.version}
                          </span>
                        )}
                      </div>

                      {mod.externalUrl && (
                        <a
                          href={mod.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0"
                        >
                          <span>Visitar sitio</span>
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V3h-6z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}