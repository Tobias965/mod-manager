"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

type GameVersion = {
  id: string;
  version: string;
};

type Game = {
  id: string;
  name: string;
  versions: GameVersion[];
};

type Category = {
  id: string;
  name: string;
};

type Mod = {
  id: string;
  name: string;
  version: string;
  gameId: string;
  gameVersionId: string;
};

type ModSource = "upload" | "external";

export default function NewModPage() {
  // ==================================================
  // DATOS
  // ==================================================

  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] =
    useState<Category[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);

  // ==================================================
  // ESTADO GENERAL
  // ==================================================

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  // ==================================================
  // MOD
  // ==================================================

  const [name, setName] =
    useState("");

  const [version, setVersion] =
    useState("");

  const [license, setLicense] =
    useState("CC-BY-NC-4.0");

  const [externalUrl, setExternalUrl] =
    useState("");

  const [modSource, setModSource] =
    useState<ModSource>("upload");

  const [file, setFile] =
    useState<File | null>(null);

  // ==================================================
  // JUEGO
  // ==================================================

  const [gameId, setGameId] =
    useState("");

  const [gameVersionId, setGameVersionId] =
    useState("");

  // ==================================================
  // CATEGORÍAS
  // ==================================================

  const [selectedCategories, setSelectedCategories] =
    useState<string[]>([]);

  const [categorySearch, setCategorySearch] =
    useState("");

  // ==================================================
  // DEPENDENCIAS
  // ==================================================

  const [selectedDependencies, setSelectedDependencies] =
    useState<string[]>([]);

  const [dependencySearch, setDependencySearch] =
    useState("");

  // ==================================================
  // INCOMPATIBILIDADES
  // ==================================================

  const [
    selectedIncompatibilities,
    setSelectedIncompatibilities,
  ] = useState<string[]>([]);

  const [
    incompatibilitySearch,
    setIncompatibilitySearch,
  ] = useState("");

  // ==================================================
  // CARGAR DATOS
  // ==================================================

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch("/api/mods");

        const contentType =
          response.headers.get(
            "content-type"
          ) || "";

        let data: any = {};

        if (
          contentType.includes(
            "application/json"
          )
        ) {
          data = await response.json();
        } else {
          const text =
            await response.text();

          throw new Error(
            text ||
              "El servidor devolvió una respuesta inesperada."
          );
        }

        if (!response.ok) {
          throw new Error(
            data.error ||
              "No se pudieron cargar los datos."
          );
        }

        setGames(data.games || []);
        setCategories(
          data.categories || []
        );
        setMods(data.mods || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los datos."
        );
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // ==================================================
  // CAMBIO DE JUEGO
  // ==================================================

  function handleGameChange(
    selectedGameId: string
  ) {
    setGameId(selectedGameId);

    setGameVersionId("");

    // Las relaciones dependen del juego y versión.
    setSelectedDependencies([]);
    setSelectedIncompatibilities([]);

    setDependencySearch("");
    setIncompatibilitySearch("");
  }

  // ==================================================
  // CAMBIO DE VERSIÓN
  // ==================================================

  function handleGameVersionChange(
    selectedVersionId: string
  ) {
    setGameVersionId(
      selectedVersionId
    );

    setSelectedDependencies([]);
    setSelectedIncompatibilities([]);

    setDependencySearch("");
    setIncompatibilitySearch("");
  }

  // ==================================================
  // CATEGORÍAS
  // ==================================================

  function toggleCategory(
    categoryId: string
  ) {
    setSelectedCategories(
      (current) => {
        if (
          current.includes(categoryId)
        ) {
          return current.filter(
            (id) =>
              id !== categoryId
          );
        }

        return [
          ...current,
          categoryId,
        ];
      }
    );
  }

  function removeCategory(
    categoryId: string
  ) {
    setSelectedCategories(
      (current) =>
        current.filter(
          (id) =>
            id !== categoryId
        )
    );
  }

  // ==================================================
  // DEPENDENCIAS
  // ==================================================

  function toggleDependency(modId: string) {
  setSelectedDependencies((current) => {
    if (current.includes(modId)) {
      return current.filter((id) => id !== modId);
    }

    return [...current, modId];
  });
}

  function removeDependency(
    modId: string
  ) {
    setSelectedDependencies(
      (current) =>
        current.filter(
          (id) =>
            id !== modId
        )
    );
  }

  // ==================================================
  // INCOMPATIBILIDADES
  // ==================================================

  function toggleIncompatibility(modId: string) {
  setSelectedIncompatibilities((current) => {
    if (current.includes(modId)) {
      return current.filter((id) => id !== modId);
    }

    return [...current, modId];
  });
}

  function removeIncompatibility(
    modId: string
  ) {
    setSelectedIncompatibilities(
      (current) =>
        current.filter(
          (id) =>
            id !== modId
        )
    );
  }

  // ==================================================
  // ARCHIVO
  // ==================================================

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ??
      null;

    setFile(selectedFile);
  }

  // ==================================================
  // JUEGO SELECCIONADO
  // ==================================================

  const selectedGame =
    games.find(
      (game) =>
        game.id === gameId
    );

  // ==================================================
  // CATEGORÍAS FILTRADAS
  // ==================================================

  const filteredCategories =
    useMemo(() => {
      const search =
        categorySearch
          .trim()
          .toLowerCase();

      return categories.filter(
        (category) =>
          !selectedCategories.includes(
            category.id
          ) &&
          category.name
            .toLowerCase()
            .includes(search)
      );
    }, [
      categories,
      categorySearch,
      selectedCategories,
    ]);

  const selectedCategoryObjects =
    useMemo(() => {
      return categories.filter(
        (category) =>
          selectedCategories.includes(
            category.id
          )
      );
    }, [
      categories,
      selectedCategories,
    ]);

  // ==================================================
  // MODS COMPATIBLES
  // ==================================================

  const compatibleMods =
    useMemo(() => {
      if (
        !gameId ||
        !gameVersionId
      ) {
        return [];
      }

      return mods.filter(
        (mod) =>
          mod.gameId === gameId &&
          mod.gameVersionId ===
            gameVersionId
      );
    }, [
      mods,
      gameId,
      gameVersionId,
    ]);

  // ==================================================
  // DEPENDENCIAS FILTRADAS
  // ==================================================

  const filteredDependencies =
    useMemo(() => {
      const search =
        dependencySearch
          .trim()
          .toLowerCase();

      return compatibleMods.filter(
  (mod) =>
    !selectedDependencies.includes(mod.id) &&
    !selectedIncompatibilities.includes(mod.id) &&
    mod.name
      .toLowerCase()
      .includes(search)
);
    }, [
      compatibleMods,
      dependencySearch,
      selectedDependencies,
      selectedIncompatibilities,
    ]);

  const selectedDependencyObjects =
    useMemo(() => {
      return compatibleMods.filter(
        (mod) =>
          selectedDependencies.includes(
            mod.id
          )
      );
    }, [
      compatibleMods,
      selectedDependencies,
    ]);

  // ==================================================
  // INCOMPATIBILIDADES FILTRADAS
  // ==================================================

  const filteredIncompatibilities =
    useMemo(() => {
      const search =
        incompatibilitySearch
          .trim()
          .toLowerCase();

      return compatibleMods.filter(
  (mod) =>
    !selectedIncompatibilities.includes(mod.id) &&
    !selectedDependencies.includes(mod.id) &&
    mod.name
      .toLowerCase()
      .includes(search)
);
    }, [
      compatibleMods,
      incompatibilitySearch,
      selectedIncompatibilities,
      selectedDependencies,
    ]);

  const selectedIncompatibilityObjects =
    useMemo(() => {
      return compatibleMods.filter(
        (mod) =>
          selectedIncompatibilities.includes(
            mod.id
          )
      );
    }, [
      compatibleMods,
      selectedIncompatibilities,
    ]);

  // ==================================================
  // ENVÍO
  // ==================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(
        "El nombre del mod es obligatorio."
      );
      return;
    }

    if (!version.trim()) {
      setError(
        "La versión del mod es obligatoria."
      );
      return;
    }

    if (!gameId) {
      setError(
        "Debes seleccionar un juego."
      );
      return;
    }

    if (!gameVersionId) {
      setError(
        "Debes seleccionar una versión del juego."
      );
      return;
    }

    if (
      selectedCategories.length === 0
    ) {
      setError(
        "Debes seleccionar al menos una categoría."
      );
      return;
    }

    if (
      modSource === "upload" &&
      !file
    ) {
      setError(
        "Debes seleccionar el archivo del mod."
      );
      return;
    }

    if (
      modSource === "external" &&
      !externalUrl.trim()
    ) {
      setError(
        "Debes proporcionar la URL del mod."
      );
      return;
    }

    setSubmitting(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "name",
        name.trim()
      );

      formData.append(
        "version",
        version.trim()
      );

      formData.append(
        "gameId",
        gameId
      );

      formData.append(
        "gameVersionId",
        gameVersionId
      );

      if (license.trim()) {
        formData.append(
          "license",
          license.trim()
        );
      }

      if (
        modSource ===
        "external"
      ) {
        formData.append(
          "externalUrl",
          externalUrl.trim()
        );
      }

      if (
        modSource === "upload" &&
        file
      ) {
        formData.append(
          "file",
          file
        );
      }

      selectedCategories.forEach(
        (categoryId) => {
          formData.append(
            "categoryIds",
            categoryId
          );
        }
      );

      selectedDependencies.forEach(
        (modId) => {
          formData.append(
            "dependencyIds",
            modId
          );
        }
      );

      selectedIncompatibilities.forEach(
        (modId) => {
          formData.append(
            "incompatibilityIds",
            modId
          );
        }
      );

      const response =
        await fetch(
          "/api/mods",
          {
            method: "POST",
            body: formData,
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      let data: {
        error?: string;
      } = {};

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        data =
          await response.json();
      } else {
        const text =
          await response.text();

        data = {
          error:
            text ||
            "El servidor devolvió una respuesta inesperada.",
        };
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudo publicar el mod."
        );
      }

      setSuccess(
        "El mod fue enviado correctamente y está pendiente de revisión."
      );

      // ------------------------------------------------
      // LIMPIAR FORMULARIO
      // ------------------------------------------------

      setName("");
      setVersion("");
      setLicense(
        "CC-BY-NC-4.0"
      );

      setExternalUrl("");
      setModSource("upload");

      setGameId("");
      setGameVersionId("");

      setSelectedCategories(
        []
      );

      setSelectedDependencies(
        []
      );

      setSelectedIncompatibilities(
        []
      );

      setCategorySearch("");
      setDependencySearch("");
      setIncompatibilitySearch("");

      setFile(null);

      const fileInput =
        document.getElementById(
          "file"
        ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo publicar el mod."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ==================================================
  // LOADING
  // ==================================================

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">
              Cargando formulario...
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
    <main className="min-h-screen bg-gray-100 px-6 py-8">
      <div className="mx-auto max-w-6xl">

        {/* CABECERA */}

        <div className="mb-5">
          <Link
            href="/mods/manage/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver
          </Link>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">

          {/* TÍTULO */}

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Publicar nuevo Mod
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Completa la información del mod.
              Todos los mods serán revisados antes
              de publicarse.
            </p>
          </div>

          {/* MENSAJES */}

          {error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* FILA PRINCIPAL */}

            <div className="grid gap-5 md:grid-cols-2">

              {/* NOMBRE */}

              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-gray-900"
                >
                  Nombre del mod *
                </label>

                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Better Vehicles"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* VERSIÓN */}

              <div>
                <label
                  htmlFor="version"
                  className="mb-1.5 block text-sm font-medium text-gray-900"
                >
                  Versión del mod *
                </label>

                <input
                  id="version"
                  type="text"
                  value={version}
                  onChange={(event) =>
                    setVersion(
                      event.target.value
                    )
                  }
                  placeholder="Ej. 1.2.0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* JUEGO */}

              <div>
                <label
                  htmlFor="gameId"
                  className="mb-1.5 block text-sm font-medium text-gray-900"
                >
                  Juego *
                </label>

                <select
                  id="gameId"
                  value={gameId}
                  onChange={(event) =>
                    handleGameChange(
                      event.target.value
                    )
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value="">
                    Selecciona un juego
                  </option>

                  {games.map(
                    (game) => (
                      <option
                        key={game.id}
                        value={game.id}
                      >
                        {game.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* VERSIÓN DEL JUEGO */}

              <div>
                <label
                  htmlFor="gameVersionId"
                  className="mb-1.5 block text-sm font-medium text-gray-900"
                >
                  Versión del juego *
                </label>

                <select
                  id="gameVersionId"
                  value={
                    gameVersionId
                  }
                  onChange={(event) =>
                    handleGameVersionChange(
                      event.target.value
                    )
                  }
                  disabled={
                    !gameId ||
                    !selectedGame
                  }
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  required
                >
                  <option value="">
                    {!gameId
                      ? "Primero selecciona un juego"
                      : "Selecciona una versión"}
                  </option>

                  {selectedGame?.versions.map(
                    (gameVersion) => (
                      <option
                        key={
                          gameVersion.id
                        }
                        value={
                          gameVersion.id
                        }
                      >
                        {
                          gameVersion.version
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

            </div>

            {/* CATEGORÍAS */}

            <div className="rounded-md border border-gray-200 p-4">

              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">
                    Categorías *
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Selecciona una o más categorías.
                  </p>
                </div>

                <span className="text-xs text-gray-500">
                  {selectedCategories.length}{" "}
                  seleccionadas
                </span>
              </div>

              {/* SELECCIONADAS */}

              {selectedCategoryObjects.length >
                0 && (
                <div className="mb-3">
                  <p className="mb-2 text-xs font-medium text-gray-600">
                    Seleccionadas
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {selectedCategoryObjects.map(
                      (category) => (
                        <button
                          key={
                            category.id
                          }
                          type="button"
                          onClick={() =>
                            removeCategory(
                              category.id
                            )
                          }
                          className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200"
                        >
                          {category.name}
                          <span className="ml-1.5">
                            ×
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* BUSCADOR */}

              <input
                type="search"
                value={
                  categorySearch
                }
                onChange={(event) =>
                  setCategorySearch(
                    event.target.value
                  )
                }
                placeholder="Buscar categoría..."
                className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />

              {/* DISPONIBLES */}

              <div className="max-h-36 overflow-y-auto rounded-md border border-gray-200">
                {filteredCategories.length ===
                0 ? (
                  <p className="p-3 text-sm text-gray-500">
                    No se encontraron categorías.
                  </p>
                ) : (
                  <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCategories.map(
                      (category) => (
                        <button
                          key={
                            category.id
                          }
                          type="button"
                          onClick={() =>
                            toggleCategory(
                              category.id
                            )
                          }
                          className="rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                        >
                          {category.name}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* DEPENDENCIAS E INCOMPATIBILIDADES */}

            <div className="grid gap-5 lg:grid-cols-2">

              {/* DEPENDENCIAS */}

              <div className="rounded-md border border-gray-200 p-4">

                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Dependencias
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Mods necesarios para que este mod funcione.
                  </p>
                </div>

                {!gameVersionId ? (
                  <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">
                    Selecciona primero el juego y
                    la versión para buscar mods.
                  </p>
                ) : (
                  <>
                    {/* SELECCIONADAS */}

                    {selectedDependencyObjects.length >
                      0 && (
                      <div className="mb-3">
                        <p className="mb-2 text-xs font-medium text-gray-600">
                          Seleccionadas
                        </p>

                        <div className="space-y-2">
                          {selectedDependencyObjects.map(
                            (mod) => (
                              <div
                                key={
                                  mod.id
                                }
                                className="flex items-center justify-between rounded-md bg-blue-50 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {mod.name}
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    v{mod.version}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeDependency(
                                      mod.id
                                    )
                                  }
                                  className="text-xs font-medium text-red-600 hover:text-red-800"
                                >
                                  Quitar
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <input
                      type="search"
                      value={
                        dependencySearch
                      }
                      onChange={(
                        event
                      ) =>
                        setDependencySearch(
                          event.target
                            .value
                        )
                      }
                      placeholder="Buscar mod..."
                      className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200">
                      {filteredDependencies.length ===
                      0 ? (
                        <p className="p-3 text-sm text-gray-500">
                          No se encontraron mods compatibles.
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {filteredDependencies.map(
                            (mod) => (
                              <button
                                key={
                                  mod.id
                                }
                                type="button"
                                onClick={() =>
                                  toggleDependency(
                                    mod.id
                                  )
                                }
                                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                              >
                                <span className="text-sm text-gray-800">
                                  {mod.name}
                                </span>

                                <span className="text-xs text-gray-500">
                                  v{mod.version}
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* INCOMPATIBILIDADES */}

              <div className="rounded-md border border-gray-200 p-4">

                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Incompatibilidades
                  </h2>

                  <p className="mt-0.5 text-xs text-gray-500">
                    Mods que no deberían utilizarse junto a este mod.
                  </p>
                </div>

                {!gameVersionId ? (
                  <p className="rounded-md bg-gray-50 p-3 text-sm text-gray-500">
                    Selecciona primero el juego y
                    la versión para buscar mods.
                  </p>
                ) : (
                  <>
                    {/* SELECCIONADAS */}

                    {selectedIncompatibilityObjects.length >
                      0 && (
                      <div className="mb-3">
                        <p className="mb-2 text-xs font-medium text-gray-600">
                          Seleccionadas
                        </p>

                        <div className="space-y-2">
                          {selectedIncompatibilityObjects.map(
                            (mod) => (
                              <div
                                key={
                                  mod.id
                                }
                                className="flex items-center justify-between rounded-md bg-red-50 px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {mod.name}
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    v{mod.version}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeIncompatibility(
                                      mod.id
                                    )
                                  }
                                  className="text-xs font-medium text-red-600 hover:text-red-800"
                                >
                                  Quitar
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    <input
                      type="search"
                      value={
                        incompatibilitySearch
                      }
                      onChange={(
                        event
                      ) =>
                        setIncompatibilitySearch(
                          event.target
                            .value
                        )
                      }
                      placeholder="Buscar mod..."
                      className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200">
                      {filteredIncompatibilities.length ===
                      0 ? (
                        <p className="p-3 text-sm text-gray-500">
                          No se encontraron mods compatibles.
                        </p>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {filteredIncompatibilities.map(
                            (mod) => (
                              <button
                                key={
                                  mod.id
                                }
                                type="button"
                                onClick={() =>
                                  toggleIncompatibility(
                                    mod.id
                                  )
                                }
                                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                              >
                                <span className="text-sm text-gray-800">
                                  {mod.name}
                                </span>

                                <span className="text-xs text-gray-500">
                                  v{mod.version}
                                </span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

            </div>

            {/* FUENTE DEL MOD */}

            <div className="rounded-md border border-gray-200 p-4">

              <div className="mb-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Fuente del mod *
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Elige dónde se encuentra el archivo del mod.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                <button
                  type="button"
                  onClick={() => {
                    setModSource(
                      "upload"
                    );
                    setExternalUrl(
                      ""
                    );
                  }}
                  className={`rounded-md border p-4 text-left transition ${
                    modSource ===
                    "upload"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    Archivo alojado
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Subir el archivo del mod a la plataforma.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModSource(
                      "external"
                    );
                    setFile(null);

                    const fileInput =
                      document.getElementById(
                        "file"
                      ) as HTMLInputElement | null;

                    if (
                      fileInput
                    ) {
                      fileInput.value =
                        "";
                    }
                  }}
                  className={`rounded-md border p-4 text-left transition ${
                    modSource ===
                    "external"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-gray-900">
                    Enlace externo
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    El usuario será redirigido al sitio original.
                  </p>
                </button>

              </div>

{/* ARCHIVO */}

{modSource ===
  "upload" && (
  <div className="mt-4">
    <label
      htmlFor="file"
      className="mb-1.5 block text-sm font-medium text-gray-900"
    >
      Archivo del mod *
    </label>

    <input
      id="file"
      type="file"
      accept=".zip,.jar,.rar,.7z"
      onChange={
        handleFileChange
      }
      className="block w-full rounded-md border border-gray-300 bg-white text-sm text-gray-700 file:mr-4 file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium"
      required
    />

    {file && (
      <p className="mt-2 text-sm text-gray-600">
        Archivo seleccionado:{" "}
        <span className="font-medium">
          {file.name}
        </span>
      </p>
    )}

    <p className="mt-1 text-xs text-gray-500">
      Formatos permitidos: ZIP, JAR, RAR y 7Z.
    </p>

    <p className="mt-1 text-xs text-gray-500">
      Límite de tamaño del archivo: 50 MB.
    </p>
  </div>
)}



              {/* URL EXTERNA */}

              {modSource ===
                "external" && (
                <div className="mt-4">
                  <label
                    htmlFor="externalUrl"
                    className="mb-1.5 block text-sm font-medium text-gray-900"
                  >
                    URL del mod *
                  </label>

                  <input
                    id="externalUrl"
                    type="url"
                    value={
                      externalUrl
                    }
                    onChange={(
                      event
                    ) =>
                      setExternalUrl(
                        event.target
                          .value
                      )
                    }
                    placeholder="https://www.nexusmods.com/..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Se permiten enlaces de CurseForge,
                    NexusMods, GitHub, Modrinth y Google Drive.
                  </p>
                </div>
              )}

            </div>

            {/* LICENCIA */}

            <div>
              <label
                htmlFor="license"
                className="mb-1.5 block text-sm font-medium text-gray-900"
              >
                Licencia
              </label>

              <select
                id="license"
                value={license}
                onChange={(event) =>
                  setLicense(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="CC-BY-NC-4.0">
                  Creative Commons - No comercial
                </option>

                <option value="ARR">
                  Todos los derechos reservados
                </option>

                <option value="MIT">
                  MIT (Código abierto permisivo)
                </option>
              </select>

              <p className="mt-1 text-xs text-gray-500">
                La licencia indica las condiciones
                bajo las que se distribuye el mod.
              </p>
            </div>
            
            {/* BOTONES */}

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5">

              <Link
                href="/"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={
                  submitting ||
                  games.length === 0 ||
                  categories.length === 0
                }
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Publicando..."
                  : "Publicar Mod"}
              </button>

            </div>

          </form>
        </div>
      </div>
    </main>
  );
}