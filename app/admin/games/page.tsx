"use client";

import { FormEvent, useEffect, useState } from "react";

import Link from "next/link";

type GameVersion = {
  id: string;
  version: string;
  createdAt: string;
};

type Game = {
  id: string;
  name: string;
  deletedAt: string | null;
  createdAt: string;
  versions: GameVersion[];
};

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);

  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [version, setVersion] = useState("");

  const [versionGameId, setVersionGameId] =
    useState("");

  const [versionName, setVersionName] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showAddGame, setShowAddGame] =
    useState(false);

  const [gameToDelete, setGameToDelete] =
    useState<Game | null>(null);
  // ==================================================
  // CARGAR JUEGOS
  // ==================================================

  async function loadGames() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/games",
        {
          cache: "no-store",
        }
      );

      const contentType =
        response.headers.get("content-type") ||
        "";

      let data: any = {};

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        throw new Error(
          text ||
            "El servidor devolvió una respuesta inesperada."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudieron cargar los juegos."
        );
      }

      setGames(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los juegos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGames();
  }, []);

  // ==================================================
  // CREAR JUEGO
  // ==================================================

  async function handleCreateGame(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(
        "El nombre del juego es obligatorio."
      );
      return;
    }

    if (!version.trim()) {
      setError(
        "La versión del juego es obligatoria."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "/api/admin/games",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name: name.trim(),
            version: version.trim(),
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") ||
        "";

      let data: any = {};

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        throw new Error(
          text ||
            "El servidor devolvió una respuesta inesperada."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo crear el juego."
        );
      }

      setName("");
      setVersion("");

      setShowAddGame(false);

      setSuccess(
        "El juego fue creado correctamente."
      );

      await loadGames();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el juego."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ==================================================
  // AÑADIR VERSIÓN
  // ==================================================

  async function handleAddVersion(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!versionGameId) {
      setError("Debes seleccionar un juego.");
      return;
    }

    if (!versionName.trim()) {
      setError(
        "La versión del juego es obligatoria."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/admin/games/${versionGameId}/versions`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            version: versionName.trim(),
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") ||
        "";

      let data: any = {};

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();

        throw new Error(
          text ||
            "El servidor devolvió una respuesta inesperada."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo añadir la versión."
        );
      }

      setVersionGameId("");
      setVersionName("");

      setSuccess(
        "La versión fue añadida correctamente."
      );

      await loadGames();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo añadir la versión."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ==================================================
  // ELIMINACIÓN LÓGICA
  // ==================================================

  function handleDeleteGame(game: Game) {
  setGameToDelete(game);
}

async function confirmDeleteGame() {
  if (!gameToDelete) {
    return;
  }

  setError("");
  setSuccess("");

  try {
    const response = await fetch(
      `/api/admin/games/${gameToDelete.id}`,
      {
        method: "DELETE",
      }
    );

    const contentType =
      response.headers.get("content-type") || "";

    let data: any = {};

    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      const text = await response.text();

      throw new Error(
        text ||
          "El servidor devolvió una respuesta inesperada."
      );
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
          "No se pudo eliminar el juego."
      );
    }

    setGameToDelete(null);

    setSuccess(
      "El juego fue eliminado correctamente."
    );

    await loadGames();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "No se pudo eliminar el juego."
    );
  }
}

  // ==================================================
  // FILTRADO
  // ==================================================

  const filteredGames = games.filter((game) =>
    game.name
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">
              Cargando juegos...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ==================================================
  // VISTA
  // ==================================================

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* CABECERA */}

        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver al panel de administración
          </Link>
        </div>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Gestión de juegos
            </h1>

            <p className="mt-2 text-gray-600">
              Administra los juegos y sus versiones.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowAddGame((current) => !current)
            }
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {showAddGame
              ? "Cancelar"
              : "Añadir juego"}
          </button>
        </div>

        {/* MENSAJES */}

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* CREAR JUEGO */}

        {showAddGame && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Añadir juego
            </h2>

            <form
              onSubmit={handleCreateGame}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Nombre del juego
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Ej. Minecraft"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="version"
                  className="mb-2 block text-sm font-medium text-gray-900"
                >
                  Versión inicial
                </label>

                <input
                  id="version"
                  type="text"
                  value={version}
                  onChange={(event) =>
                    setVersion(event.target.value)
                  }
                  placeholder="Ej. 1.20.1"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? "Creando..."
                    : "Crear juego"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* AÑADIR VERSIÓN */}

        <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Añadir versión a un juego
          </h2>

          <form
            onSubmit={handleAddVersion}
            className="grid gap-4 sm:grid-cols-3"
          >
            <div>
              <label
                htmlFor="versionGameId"
                className="mb-2 block text-sm font-medium text-gray-900"
              >
                Juego
              </label>

              <select
                id="versionGameId"
                value={versionGameId}
                onChange={(event) =>
                  setVersionGameId(
                    event.target.value
                  )
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              >
                <option value="">
                  Selecciona un juego
                </option>

                {games.map((game) => (
                  <option
                    key={game.id}
                    value={game.id}
                  >
                    {game.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="versionName"
                className="mb-2 block text-sm font-medium text-gray-900"
              >
                Nueva versión
              </label>

              <input
                id="versionName"
                type="text"
                value={versionName}
                onChange={(event) =>
                  setVersionName(
                    event.target.value
                  )
                }
                placeholder="Ej. 1.21.1"
                className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-gray-800 px-5 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Añadir versión
              </button>
            </div>
          </form>
        </div>

        {/* BUSCADOR */}

        <div className="mb-6 rounded-lg bg-white p-5 shadow-md">
          <label
            htmlFor="search"
            className="mb-2 block text-sm font-medium text-gray-900"
          >
            Buscar juego
          </label>

          <input
            id="search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Escribe el nombre del juego..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* LISTADO */}

        <div className="space-y-4">
          {filteredGames.length === 0 ? (
            <div className="rounded-lg bg-white p-8 text-center shadow">
              <p className="text-gray-500">
                No se encontraron juegos.
              </p>
            </div>
          ) : (
            filteredGames.map((game) => (
              <details
                key={game.id}
                className="rounded-lg bg-white shadow-md"
              >
                <summary className="cursor-pointer list-none p-5 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {game.name}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {game.versions.length}{" "}
                        {game.versions.length === 1
                          ? "versión"
                          : "versiones"}
                      </p>
                    </div>

                    <span className="text-sm text-gray-400">
                      Ver versiones
                    </span>
                  </div>
                </summary>

                <div className="border-t border-gray-200 p-5">

                  {game.versions.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Este juego no tiene versiones.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {game.versions.map(
                        (gameVersion) => (
                          <div
                            key={gameVersion.id}
                            className="rounded-md border border-gray-200 p-3"
                          >
                            <span className="font-medium text-gray-900">
                              {gameVersion.version}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="mt-5 flex justify-end border-t border-gray-200 pt-4">
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteGame(game)
                      }
                      className="rounded-md border border-[#653344] bg-[#351D28] px-4 py-2 text-sm font-medium text-[#E084A0] hover:bg-[#351D28]"
                    >
                      Eliminar juego
                    </button>
                  </div>
                </div>
              </details>
            ))
          )}
        </div>

        {/* MODAL DE CONFIRMACIÓN */}

        {gameToDelete && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-game-title"
          >
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <h2
                id="delete-game-title"
                className="text-xl font-semibold text-gray-900"
              >
                ¿Estás seguro de borrar "{gameToDelete.name}"?
              </h2>

              <p className="mt-3 text-sm text-gray-600">
                Esta acción quitará el juego de la lista.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGameToDelete(null)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteGame}
                  className="rounded-md border border-[#653344] bg-[#351D28] px-4 py-2 text-sm font-medium text-[#E084A0] hover:bg-[#351D28]"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
