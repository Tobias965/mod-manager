"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

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

type RelatedMod = {
  id: string;
  name: string;
  version: string;
  gameId: string;
  gameVersionId: string;
  status: string;
};

type Mod = {
  id: string;
  name: string;
  version: string;
  license: string | null;
  externalUrl: string | null;
  storageKey?: string | null;
  status: string;
  gameId: string;
  gameVersionId: string;
  categories: { categoryId: string }[];
  dependencies: { dependencyId: string }[];
  incompatibilities: { incompatibleId: string }[];
};

export default function EditModPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [mod, setMod] = useState<Mod | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableMods, setAvailableMods] = useState<RelatedMod[]>([]);

  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [license, setLicense] = useState("CC-BY-NC-4.0");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [gameId, setGameId] = useState("");
  const [gameVersionId, setGameVersionId] = useState("");

  const [categorySearch, setCategorySearch] = useState("");
  const [dependencySearch, setDependencySearch] = useState("");
  const [incompatibilitySearch, setIncompatibilitySearch] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(
    []
  );
  const [selectedIncompatibilities, setSelectedIncompatibilities] = useState<
    string[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [modResponse, dataResponse] = await Promise.all([
          fetch(`/api/mods/${id}`, { cache: "no-store" }),
          fetch("/api/mods", { cache: "no-store" }),
        ]);

        const modData = await modResponse.json();
        const data = await dataResponse.json();

        if (!modResponse.ok) {
          throw new Error(modData.error || "No se pudo cargar el mod.");
        }

        if (!dataResponse.ok) {
          throw new Error(data.error || "No se pudieron cargar los datos.");
        }

        setMod(modData);
        setGames(data.games || []);
        setCategories(data.categories || []);

        setName(modData.name);
        setVersion(modData.version);
        setLicense(modData.license || "CC-BY-NC-4.0");
        setExternalUrl(modData.externalUrl || "");
        setGameId(modData.gameId);
        setGameVersionId(modData.gameVersionId);

        setSelectedCategories(
          modData.categories.map(
            (item: { categoryId: string }) => item.categoryId
          )
        );

        setSelectedDependencies(
          modData.dependencies.map(
            (item: { dependencyId: string }) => item.dependencyId
          )
        );

        setSelectedIncompatibilities(
          modData.incompatibilities.map(
            (item: { incompatibleId: string }) => item.incompatibleId
          )
        );

        const modsResponse = await fetch(
          `/api/mods/search?gameId=${encodeURIComponent(
            modData.gameId
          )}&gameVersionId=${encodeURIComponent(modData.gameVersionId)}`,
          { cache: "no-store" }
        );

        if (modsResponse.ok) {
          const modsData = await modsResponse.json();

          setAvailableMods(
            (modsData.mods || []).filter(
              (item: RelatedMod) => item.id !== id
            )
          );
        }
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

    if (id) loadData();
  }, [id]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setError("");

    const selectedFile = e.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError("El archivo excede el límite permitido de 50 MB.");
      e.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  async function handleGameVersionChange(value: string) {
    setGameVersionId(value);
    setSelectedDependencies([]);
    setSelectedIncompatibilities([]);
    setDependencySearch("");
    setIncompatibilitySearch("");

    if (!gameId || !value) {
      setAvailableMods([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/mods/search?gameId=${encodeURIComponent(
          gameId
        )}&gameVersionId=${encodeURIComponent(value)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudieron cargar los mods.");
      }

      setAvailableMods(
        (data.mods || []).filter(
          (item: RelatedMod) => item.id !== id
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los mods."
      );
    }
  }

  function toggleCategory(categoryId: string) {
    setSelectedCategories((current) =>
      current.includes(categoryId)
        ? current.filter((item) => item !== categoryId)
        : [...current, categoryId]
    );
  }

  function toggleDependency(modId: string) {
    setSelectedDependencies((current) => {
      if (current.includes(modId)) {
        return current.filter((item) => item !== modId);
      }

      setSelectedIncompatibilities((currentIncompatible) =>
        currentIncompatible.filter((item) => item !== modId)
      );

      return [...current, modId];
    });
  }

  function toggleIncompatibility(modId: string) {
    setSelectedIncompatibilities((current) => {
      if (current.includes(modId)) {
        return current.filter((item) => item !== modId);
      }

      setSelectedDependencies((currentDependencies) =>
        currentDependencies.filter((item) => item !== modId)
      );

      return [...current, modId];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      return setError("El nombre del mod es obligatorio.");
    }

    if (!version.trim()) {
      return setError("La versión del mod es obligatoria.");
    }

    if (!gameId) {
      return setError("Debes seleccionar un juego.");
    }

    if (!gameVersionId) {
      return setError("Debes seleccionar una versión del juego.");
    }

    if (selectedCategories.length === 0) {
      return setError("Debes seleccionar al menos una categoría.");
    }

    if (!mod?.storageKey && !file && !externalUrl.trim()) {
      return setError(
        "Debes ingresar una URL externa o subir un archivo para el mod."
      );
    }

    setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("version", version.trim());
      formData.append("license", license.trim());
      formData.append("gameId", gameId);
      formData.append("gameVersionId", gameVersionId);
      formData.append("status", "PENDING");

      if (file) {
        formData.append("file", file);
      } else if (!mod?.storageKey) {
        formData.append("externalUrl", externalUrl.trim());
      }

      formData.append(
        "categoryIds",
        JSON.stringify(selectedCategories)
      );

      formData.append(
        "dependencyIds",
        JSON.stringify(selectedDependencies)
      );

      formData.append(
        "incompatibilityIds",
        JSON.stringify(selectedIncompatibilities)
      );

      const response = await fetch(`/api/mods/${id}`, {
        method: "PUT",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo actualizar el mod.");
      }

      setTimeout(() => {
        router.push(`/mods/manage/${id}`);
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el mod."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-gray-600">Cargando formulario...</p>
        </div>
      </main>
    );
  }

  if (!mod) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-5xl rounded-lg bg-red-50 p-6 text-red-700">
          {error || "No se pudo cargar el mod."}
        </div>
      </main>
    );
  }

  const selectedGame = games.find((game) => game.id === gameId);

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredDependencyMods = availableMods.filter(
    (item) =>
      !selectedIncompatibilities.includes(item.id) &&
      item.name.toLowerCase().includes(dependencySearch.toLowerCase())
  );

  const filteredIncompatibilityMods = availableMods.filter(
    (item) =>
      !selectedDependencies.includes(item.id) &&
      item.name
        .toLowerCase()
        .includes(incompatibilitySearch.toLowerCase())
  );

  const selectedDependencyMods = availableMods.filter((item) =>
    selectedDependencies.includes(item.id)
  );

  const selectedIncompatibilityMods = availableMods.filter((item) =>
    selectedIncompatibilities.includes(item.id)
  );

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href={`/mods/manage/${id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            ← Volver al mod
          </Link>
        </div>

        <div className="rounded-lg bg-white p-8 shadow-md">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">
            Editar mod
          </h1>

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

          <form onSubmit={handleSubmit} className="space-y-8">
            <section>
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Información del mod
              </h2>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-gray-900"
                  >
                    Nombre del mod *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="version"
                    className="mb-2 block text-sm font-medium text-gray-900"
                  >
                    Versión del mod *
                  </label>
                  <input
                    id="version"
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="game"
                    className="mb-2 block text-sm font-medium text-gray-900"
                  >
                    Juego
                  </label>
                  <input
                    id="game"
                    type="text"
                    value={selectedGame?.name || "Cargando juego..."}
                    disabled
                    readOnly
                    className="w-full cursor-not-allowed rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="gameVersionId"
                    className="mb-2 block text-sm font-medium text-gray-900"
                  >
                    Versión del juego *
                  </label>
                  <select
                    id="gameVersionId"
                    value={gameVersionId}
                    onChange={(e) =>
                      handleGameVersionChange(e.target.value)
                    }
                    disabled={!gameId}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                    required
                  >
                    <option value="">Selecciona una versión</option>
                    {selectedGame?.versions.map((gameVersion) => (
                      <option key={gameVersion.id} value={gameVersion.id}>
                        {gameVersion.version}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="license"
                    className="mb-2 block text-sm font-medium text-gray-900"
                  >
                    Licencia
                  </label>
                  <select
                    id="license"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2"
                  >
                    <option value="CC-BY-NC-4.0">
                      Creative Commons - No comercial
                    </option>
                    <option value="ARR">Todos los derechos reservados</option>
                    <option value="MIT">MIT</option>
                  </select>
                </div>

                {mod.storageKey || file ? (
                  <div>
                    <label
                      htmlFor="file"
                      className="mb-2 block text-sm font-medium text-gray-900"
                    >
                      Archivo del mod (Máx. 50 MB)
                    </label>
                    <input
                      id="file"
                      type="file"
                      accept=".zip,.rar,.7z"
                      onChange={handleFileChange}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {file
                        ? `Nuevo archivo: ${file.name} (${(
                            file.size /
                            (1024 * 1024)
                          ).toFixed(2)} MB)`
                        : "Selecciona un archivo si deseas reemplazar el actual."}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="externalUrl"
                      className="mb-2 block text-sm font-medium text-gray-900"
                    >
                      URL externa *
                    </label>
                    <input
                      id="externalUrl"
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                )}
              </div>
            </section>

            <section className="border-t border-gray-200 pt-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Categorías *
              </h2>

              <input
                type="search"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Buscar categoría..."
                className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2"
              />

              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {filteredCategories.map((category) => (
                  <label
                    key={category.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => toggleCategory(category.id)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">
                      {category.name}
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="border-t border-gray-200 pt-8">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Dependencias
              </h2>

              <p className="mb-4 text-sm text-gray-500">
                Selecciona los mods necesarios para que este mod funcione.
              </p>

              <input
                type="search"
                value={dependencySearch}
                onChange={(e) => setDependencySearch(e.target.value)}
                placeholder="Buscar dependencia..."
                className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2"
              />

              {selectedDependencyMods.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedDependencyMods.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleDependency(item.id)}
                      className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 hover:bg-blue-200"
                    >
                      {item.name} {item.version} ×
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {filteredDependencyMods.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDependencies.includes(item.id)}
                      onChange={() => toggleDependency(item.id)}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Versión {item.version}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {filteredDependencyMods.length === 0 &&
                selectedDependencyMods.length === 0 && (
                  <p className="mt-3 text-sm text-gray-500">
                    No hay mods disponibles para usar como dependencia.
                  </p>
                )}
            </section>

            <section className="border-t border-gray-200 pt-8">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">
                Incompatibilidades
              </h2>

              <p className="mb-4 text-sm text-gray-500">
                Selecciona los mods que no deberían utilizarse junto con este
                mod.
              </p>

              <input
                type="search"
                value={incompatibilitySearch}
                onChange={(e) => setIncompatibilitySearch(e.target.value)}
                placeholder="Buscar incompatibilidad..."
                className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2"
              />

              {selectedIncompatibilityMods.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {selectedIncompatibilityMods.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleIncompatibility(item.id)}
                      className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-800 hover:bg-red-200"
                    >
                      {item.name} {item.version} ×
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {filteredIncompatibilityMods.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIncompatibilities.includes(item.id)}
                      onChange={() => toggleIncompatibility(item.id)}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Versión {item.version}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {filteredIncompatibilityMods.length === 0 &&
                selectedIncompatibilityMods.length === 0 && (
                  <p className="mt-3 text-sm text-gray-500">
                    No hay mods disponibles para marcar como incompatibles.
                  </p>
                )}
            </section>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
              <Link
                href={`/mods/manage/${id}`}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting
                  ? "Guardando cambios..."
                  : "Guardar y enviar a revisión"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}