"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ModStatus = "PENDING" | "APPROVED" | "REJECTED";

type Mod = {
  id: string;
  name: string;
  version: string;
  status: ModStatus;
  createdAt: string;
  deletedAt?: string | null;
  game: {
    id: string;
    name: string;
  };
  gameVersion: {
    id: string;
    version: string;
  };
};

export default function ManageModsPage() {
  // ==================================================
  // ESTADO
  // ==================================================

  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewTrash, setViewTrash] = useState(false);

  const [modToDelete, setModToDelete] = useState<Mod | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  // ==================================================
  // CARGAR MODS
  // ==================================================

  useEffect(() => {
    async function loadMods() {
      try {
        setLoading(true);
        setError("");

        const endpoint = viewTrash
          ? "/api/mods/manage?trash=true"
          : "/api/mods/manage";

        const response = await fetch(endpoint);
        const contentType = response.headers.get("content-type") || "";

        let data: { mods?: Mod[]; error?: string } = {};

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          data = {
            error: text || "El servidor devolvió una respuesta inesperada.",
          };
        }

        if (!response.ok) {
          throw new Error(data.error || "No se pudieron cargar tus mods.");
        }

        setMods(data.mods || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar tus mods."
        );
      } finally {
        setLoading(false);
      }
    }

    loadMods();
  }, [viewTrash]);

  // ==================================================
  // BORRADO LÓGICO
  // ==================================================

  async function confirmDelete() {
    if (!modToDelete) return;

    const modId = modToDelete.id;

    try {
      setActionId(modId);
      setError("");

      const response = await fetch(`/api/mods/${modId}`, {
        method: "DELETE",
      });

      const contentType = response.headers.get("content-type") || "";
      let data: { error?: string } = {};

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || "Respuesta inesperada del servidor." };
      }

      if (!response.ok) {
        throw new Error(data.error || "No se pudo eliminar el mod.");
      }

      setMods((currentMods) => currentMods.filter((mod) => mod.id !== modId));
      setModToDelete(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar el mod."
      );
      setModToDelete(null);
    } finally {
      setActionId(null);
    }
  }

  // ==================================================
  // RESTAURAR MOD
  // ==================================================

  async function handleRestore(modId: string) {
    try {
      setActionId(modId);
      setError("");

      const response = await fetch(`/api/mods/${modId}`, {
        method: "PATCH",
      });

      const contentType = response.headers.get("content-type") || "";
      let data: { error?: string } = {};

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { error: text || "Respuesta inesperada del servidor." };
      }

      if (!response.ok) {
        throw new Error(data.error || "No se pudo restaurar el mod.");
      }

      setMods((currentMods) => currentMods.filter((mod) => mod.id !== modId));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo restaurar el mod."
      );
    } finally {
      setActionId(null);
    }
  }

  // ==================================================
  // FORMATO DE ESTADOS
  // ==================================================

  function getStatusLabel(status: ModStatus) {
    switch (status) {
      case "APPROVED":
        return "Aprobado";
      case "PENDING":
        return "Pendiente";
      case "REJECTED":
        return "Rechazado";
      default:
        return status;
    }
  }

  function getStatusClass(status: ModStatus) {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">Cargando tus mods...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        {/* NAVEGACIÓN DINÁMICA DE RETORNO */}
        <div className="mb-5">
          {viewTrash ? (
            <button
              type="button"
              onClick={() => setViewTrash(false)}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Volver
            </button>
          ) : (
            <Link
              href="/"
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              ← Volver
            </Link>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          {/* CABECERA Y SELECTOR DE VISTA */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {viewTrash ? "Papelera de Mods" : "Gestor de Mods"}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {viewTrash
                  ? "Consulta y restaura los mods que has eliminado."
                  : "Administra los mods que has publicado."}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewTrash(!viewTrash)}
                className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium border transition-colors ${
                  viewTrash
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {viewTrash ? "Ver Activos" : "Papelera"}
              </button>

              <Link
                href="/mods/manage/new"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + Publicar Mod
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* LISTADO VACÍO */}
          {mods.length === 0 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-8 text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {viewTrash
                  ? "La papelera está vacía"
                  : "No tienes mods publicados"}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {viewTrash
                  ? "Los mods que elimines aparecerán aquí por si deseas restaurarlos."
                  : "Cuando publiques un mod, aparecerá aquí para que puedas administrarlo."}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-gray-200">
              {/* ENCABEZADOS TABLA */}
              <div className="hidden grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase text-gray-500 md:grid">
                <div className={viewTrash ? "col-span-4" : "col-span-3"}>
                  Mod
                </div>
                <div className="col-span-3">Juego</div>
                <div className="col-span-2">Versión</div>
                {!viewTrash && <div className="col-span-1">Estado</div>}
                <div className="col-span-3 text-right">Acciones</div>
              </div>

              {/* FILAS DE MODS */}
              <div className="divide-y divide-gray-200">
                {mods.map((mod) => (
                  <div
                    key={mod.id}
                    className="grid gap-4 px-4 py-4 md:grid-cols-12 md:items-center"
                  >
                    <div
                      className={
                        viewTrash ? "md:col-span-4" : "md:col-span-3"
                      }
                    >
                      <p className="font-medium text-gray-900">{mod.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Creado el{" "}
                        {new Date(mod.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="md:col-span-3">
                      <p className="text-sm text-gray-800">{mod.game.name}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Versión {mod.gameVersion.version}
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-sm text-gray-700">
                        v{mod.version}
                      </span>
                    </div>

                    {!viewTrash && (
                      <div className="md:col-span-1">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                            mod.status
                          )}`}
                        >
                          {getStatusLabel(mod.status)}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-start gap-2 md:col-span-3 md:justify-end">
                      {viewTrash ? (
                        <button
                          type="button"
                          onClick={() => handleRestore(mod.id)}
                          disabled={actionId === mod.id}
                          className="rounded-md border border-green-300 px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
                        >
                          {actionId === mod.id ? "Restaurando..." : "Restaurar"}
                        </button>
                      ) : (
                        <>
                          <Link
                            href={`/mods/manage/${mod.id}`}
                            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Ver
                          </Link>

                          <Link
                            href={`/mods/manage/${mod.id}/edit`}
                            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Editar
                          </Link>

                          <button
                            type="button"
                            onClick={() => setModToDelete(mod)}
                            className="rounded-md border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN MODERNO */}
      {modToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl transition-all">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  ¿Eliminar mod?
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  ¿Estás seguro de enviar{" "}
                  <span className="font-semibold text-gray-700">
                    "{modToDelete.name}"
                  </span>{" "}
                  a la papelera? Las relaciones de dependencias se mantendrán intactas.
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModToDelete(null)}
                disabled={actionId !== null}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={actionId !== null}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionId === modToDelete.id
                  ? "Eliminando..."
                  : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}