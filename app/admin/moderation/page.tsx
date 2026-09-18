import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

// ==================================================
// PANEL DE MODERACIÓN
// ==================================================

export default async function ModerationPanel() {
  const pendingMods = await prisma.mod.findMany({
    where: {
      status: "PENDING",
      deletedAt: null, // <-- Filtra solo los mods que NO estén borrados
    },

    include: {
      game: true,
      gameVersion: true,

      author: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },

      categories: {
        include: {
          category: true,
        },
      },

      // ==================================================
      // DEPENDENCIAS
      // ==================================================

      dependencies: {
        include: {
          dependency: {
            select: {
              id: true,
              name: true,
              version: true,
              status: true,
            },
          },
        },
      },

      // ==================================================
      // INCOMPATIBILIDADES
      // ==================================================

      incompatibilities: {
        include: {
          incompatible: {
            select: {
              id: true,
              name: true,
              version: true,
              status: true,
            },
          },
        },
      },
    },

    orderBy: {
      createdAt: "asc",
    },
  });

  // ==================================================
  // ACTUALIZAR ESTADO
  // ==================================================

  async function updateStatus(
    modId: string,
    status: "APPROVED" | "REJECTED"
  ) {
    "use server";

    await prisma.mod.update({
      where: {
        id: modId,
      },

      data: {
        status,
      },
    });

    revalidatePath("/admin/moderation");
    revalidatePath("/");
  }

  // ==================================================
  // OBTENER NIVEL DE RIESGO
  // ==================================================

  function getFileRisk(
    fileName: string | null,
    externalUrl: string | null
  ) {
    if (!fileName && externalUrl) {
      return {
        label: "Fuente externa",
        description:
          "El archivo se obtiene desde una plataforma externa.",
        className: "bg-blue-100 text-blue-800",
      };
    }

    if (!fileName) {
      return {
        label: "Sin archivo",
        description:
          "El mod utiliza una fuente externa de descarga.",
        className: "bg-gray-100 text-gray-700",
      };
    }

    const extension =
      fileName.toLowerCase().split(".").pop() || "";

    if (
      extension === "zip" ||
      extension === "jar" ||
      extension === "rar" ||
      extension === "7z"
    ) {
      return {
        label: "Riesgo bajo",
        description:
          "Formato de archivo permitido por la plataforma.",
        className: "bg-green-100 text-green-800",
      };
    }

    if (
      extension === "exe" ||
      extension === "dll"
    ) {
      return {
        label: "Riesgo alto",
        description:
          "Este formato requiere análisis manual antes de aprobar.",
        className: "bg-red-100 text-red-800",
      };
    }

    return {
      label: "Revisar",
      description:
        "El formato requiere comprobación manual.",
      className: "bg-yellow-100 text-yellow-800",
    };
  }

  // ==================================================
  // VISTA
  // ==================================================

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver al panel de administración
          </Link>
        </div>

        {/* CABECERA */}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Panel de Moderación
          </h1>

          <p className="mt-2 text-gray-600">
            Revisa los mods pendientes antes de publicarlos.
          </p>
        </div>

        {/* SIN MODS */}

        {pendingMods.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-500">
              No hay mods pendientes de revisión.
            </p>
          </div>
        ) : (

          /* LISTADO */

          <div className="space-y-5">

            {pendingMods.map((mod) => {
              const fileRisk = getFileRisk(
                mod.fileName,
                mod.externalUrl
              );

              return (
                <div
                  key={mod.id}
                  className="rounded-lg bg-white p-6 shadow-md"
                >

                  <div className="flex flex-col gap-6">

                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">
                          {mod.name}
                        </h2>

                        <p className="text-sm text-gray-500">
                          Versión del mod: {mod.version}
                        </p>
                      </div>

                      <span className="rounded-full border border-[#625B2B] bg-[#302D18] px-3 py-1 text-xs font-medium text-[#E5D36A]">
                        PENDING
                      </span>
                    </div>

                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                      <h3 className="mb-3 font-semibold text-gray-900">
                        Compatibilidad
                      </h3>

                      <div className="grid gap-4 sm:grid-cols-2">

                        <div>
                          <p className="text-xs text-gray-500">
                            Juego
                          </p>

                          <p className="font-medium text-gray-900">
                            {mod.game.name}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-gray-500">
                            Versión del juego
                          </p>

                          <p className="font-medium text-gray-900">
                            {mod.gameVersion.version}
                          </p>
                        </div>

                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Autor
                      </p>

                      <p className="text-sm font-medium text-gray-900">
                        {mod.author.email}
                      </p>

                      <p className="text-xs text-gray-500">
                        Rol: {mod.author.role}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Licencia
                      </p>

                      <p className="text-sm text-gray-900">
                        {mod.license || "No especificada"}
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs text-gray-500">
                        Categorías
                      </p>

                      {mod.categories.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Sin categorías
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {mod.categories.map(
                            (modCategory) => (
                              <span
                                key={`${mod.id}-${modCategory.categoryId}`}
                                className="rounded border border-[#245466] bg-[#172A35] px-2 py-1 text-xs text-[#55C7D8]"
                              >
                                {modCategory.category.name}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        Dependencias
                      </p>

                      {mod.dependencies.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Este mod no tiene dependencias.
                        </p>
                      ) : (
                        <div className="space-y-2">

                          {mod.dependencies.map(
                            (dependency) => (
                              <div
                                key={`${mod.id}-${dependency.dependencyId}`}
                                className="rounded-md border border-[#29495A] bg-[#172631] p-3"
                              >
                                <div className="flex items-center justify-between gap-3">

                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {
                                        dependency.dependency.name
                                      }
                                    </p>

                                    <p className="text-xs text-gray-500">
                                      Versión{" "}
                                      {
                                        dependency.dependency.version
                                      }
                                    </p>
                                  </div>

                                </div>
                              </div>
                            )
                          )}

                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        Incompatibilidades
                      </p>

                      {mod.incompatibilities.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Este mod no tiene incompatibilidades.
                        </p>
                      ) : (
                        <div className="space-y-2">

                          {mod.incompatibilities.map(
                            (incompatibility) => (
                              <div
                                key={`${mod.id}-${incompatibility.incompatibleId}`}
                                className="rounded-md border border-[#50365A] bg-[#281E2B] p-3"
                              >
                                <div className="flex items-center justify-between gap-3">

                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {
                                        incompatibility
                                          .incompatible
                                          .name
                                      }
                                    </p>

                                    <p className="text-xs text-gray-500">
                                      Versión{" "}
                                      {
                                        incompatibility
                                          .incompatible
                                          .version
                                      }
                                    </p>
                                  </div>

                                </div>
                              </div>
                            )
                          )}

                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-medium text-gray-500">
                        Información del archivo
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">

                        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs text-gray-500">
                            Archivo
                          </p>

                          {mod.fileName ? (
                            <>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                                  ✓
                                </span>

                                <span className="text-sm font-medium text-gray-800">
                                  Archivo disponible
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-gray-500">
                                El mod incluye un archivo para su descarga.
                              </p>

                              <p className="mt-2 text-xs text-gray-600">
                                Nombre:{" "}
                                <span className="font-medium">
                                  {mod.fileName}
                                </span>
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="mt-2 flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500">
                                  —
                                </span>

                                <span className="text-sm font-medium text-gray-700">
                                  Sin archivo
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-gray-500">
                                El mod utiliza una fuente externa para su descarga.
                              </p>
                            </>
                          )}
                        </div>

                        <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                          <p className="text-xs text-gray-500">
                            Evaluación del archivo
                          </p>

                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${fileRisk.className}`}
                            >
                              {fileRisk.label}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-gray-500">
                            {fileRisk.description}
                          </p>
                        </div>

                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500">
                        Fuente de descarga
                      </p>

                      {mod.fileUrl ? (
                        <p className="mt-1 text-sm text-gray-700">
                          Archivo alojado en la plataforma
                        </p>
                      ) : mod.externalUrl ? (
                        <a
                          href={mod.externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block break-all text-sm text-blue-600 hover:text-blue-800"
                        >
                          {mod.externalUrl}
                        </a>
                      ) : (
                        <p className="mt-1 text-sm text-gray-500">
                          No se ha especificado una fuente.
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">

                      <form
                        action={updateStatus.bind(
                          null,
                          mod.id,
                          "REJECTED"
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-md border border-[#653344] bg-[#351D28] px-4 py-2 text-sm font-medium text-[#E084A0] hover:bg-[#351D28]"
                        >
                          Rechazar
                        </button>
                      </form>

                      <form
                        action={updateStatus.bind(
                          null,
                          mod.id,
                          "APPROVED"
                        )}
                      >
                        <button
                          type="submit"
                          className="rounded-md border border-[#286052] bg-[#15332C] px-4 py-2 text-sm font-medium text-[#65D6B4] hover:bg-[#15332C]"
                        >
                          Aprobar
                        </button>
                      </form>

                    </div>

                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>
    </main>
  );
}