import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  Category,
  Game,
  Mod,
  ModSource,
  ModsPageData,
} from "@/types/mod";

function toggleId(current: string[], id: string): string[] {
  return current.includes(id)
    ? current.filter((currentId) => currentId !== id)
    : [...current, id];
}

export function useNewModForm() {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [license, setLicense] = useState("CC-BY-NC-4.0");
  const [externalUrl, setExternalUrl] = useState("");
  const [modSource, setModSource] = useState<ModSource>("upload");
  const [file, setFile] = useState<File | null>(null);

  const [gameId, setGameId] = useState("");
  const [gameVersionId, setGameVersionId] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [dependencySearch, setDependencySearch] = useState("");
  const [selectedIncompatibilities, setSelectedIncompatibilities] = useState<string[]>([]);
  const [incompatibilitySearch, setIncompatibilitySearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/mods");
        const contentType = response.headers.get("content-type") || "";
        let data: ModsPageData;

        if (contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          throw new Error(text || "El servidor devolvió una respuesta inesperada.");
        }

        if (!response.ok) {
          throw new Error(data.error || "No se pudieron cargar los datos.");
        }

        if (!cancelled) {
          setGames(data.games || []);
          setCategories(data.categories || []);
          setMods(data.mods || []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar los datos."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  function resetRelations() {
    setSelectedDependencies([]);
    setSelectedIncompatibilities([]);
    setDependencySearch("");
    setIncompatibilitySearch("");
  }

  function handleGameChange(nextGameId: string) {
    setGameId(nextGameId);
    setGameVersionId("");
    resetRelations();
  }

  function handleGameVersionChange(nextGameVersionId: string) {
    setGameVersionId(nextGameVersionId);
    resetRelations();
  }

  function handleFileChange(nextFile: File | null) {
    setFile(nextFile);
  }

  function setSource(nextSource: ModSource) {
    setModSource(nextSource);
    if (nextSource === "upload") setExternalUrl("");
    if (nextSource === "external") setFile(null);
  }

  const selectedGame = games.find((game) => game.id === gameId);
  const compatibleMods = useMemo(
    () =>
      gameId && gameVersionId
        ? mods.filter(
            (mod) => mod.gameId === gameId && mod.gameVersionId === gameVersionId
          )
        : [],
    [gameId, gameVersionId, mods]
  );

  const filteredCategories = useMemo(() => {
    const search = categorySearch.trim().toLowerCase();
    return categories.filter(
      (category) =>
        !selectedCategories.includes(category.id) &&
        category.name.toLowerCase().includes(search)
    );
  }, [categories, categorySearch, selectedCategories]);

  const selectedCategoryObjects = useMemo(
    () => categories.filter((category) => selectedCategories.includes(category.id)),
    [categories, selectedCategories]
  );

  const filteredDependencies = useMemo(() => {
    const search = dependencySearch.trim().toLowerCase();
    return compatibleMods.filter(
      (mod) =>
        !selectedDependencies.includes(mod.id) &&
        !selectedIncompatibilities.includes(mod.id) &&
        mod.name.toLowerCase().includes(search)
    );
  }, [compatibleMods, dependencySearch, selectedDependencies, selectedIncompatibilities]);

  const selectedDependencyObjects = useMemo(
    () => compatibleMods.filter((mod) => selectedDependencies.includes(mod.id)),
    [compatibleMods, selectedDependencies]
  );

  const filteredIncompatibilities = useMemo(() => {
    const search = incompatibilitySearch.trim().toLowerCase();
    return compatibleMods.filter(
      (mod) =>
        !selectedIncompatibilities.includes(mod.id) &&
        !selectedDependencies.includes(mod.id) &&
        mod.name.toLowerCase().includes(search)
    );
  }, [compatibleMods, incompatibilitySearch, selectedDependencies, selectedIncompatibilities]);

  const selectedIncompatibilityObjects = useMemo(
    () => compatibleMods.filter((mod) => selectedIncompatibilities.includes(mod.id)),
    [compatibleMods, selectedIncompatibilities]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!name.trim()) return setError("El nombre del mod es obligatorio.");
    if (!version.trim()) return setError("La versión del mod es obligatoria.");
    if (!gameId) return setError("Debes seleccionar un juego.");
    if (!gameVersionId) return setError("Debes seleccionar una versión del juego.");
    if (selectedCategories.length === 0) {
      return setError("Debes seleccionar al menos una categoría.");
    }
    if (modSource === "upload" && !file) {
      return setError("Debes seleccionar el archivo del mod.");
    }
    if (modSource === "external" && !externalUrl.trim()) {
      return setError("Debes proporcionar la URL del mod.");
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("version", version.trim());
      formData.append("gameId", gameId);
      formData.append("gameVersionId", gameVersionId);
      if (license.trim()) formData.append("license", license.trim());
      if (modSource === "external") formData.append("externalUrl", externalUrl.trim());
      if (modSource === "upload" && file) formData.append("file", file);
      selectedCategories.forEach((id) => formData.append("categoryIds", id));
      selectedDependencies.forEach((id) => formData.append("dependencyIds", id));
      selectedIncompatibilities.forEach((id) => formData.append("incompatibilityIds", id));

      const response = await fetch("/api/mods", { method: "POST", body: formData });
      const contentType = response.headers.get("content-type") || "";
      const data: { error?: string } = contentType.includes("application/json")
        ? await response.json()
        : { error: (await response.text()) || "El servidor devolvió una respuesta inesperada." };

      if (!response.ok) throw new Error(data.error || "No se pudo publicar el mod.");

      setSuccess("El mod fue enviado correctamente y está pendiente de revisión.");
      setName("");
      setVersion("");
      setLicense("CC-BY-NC-4.0");
      setExternalUrl("");
      setModSource("upload");
      setGameId("");
      setGameVersionId("");
      setSelectedCategories([]);
      setSelectedDependencies([]);
      setSelectedIncompatibilities([]);
      setCategorySearch("");
      setDependencySearch("");
      setIncompatibilitySearch("");
      setFile(null);
      const fileInput = document.getElementById("file") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo publicar el mod."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return {
    games,
    categories,
    loading,
    submitting,
    error,
    success,
    name,
    setName,
    version,
    setVersion,
    license,
    setLicense,
    externalUrl,
    setExternalUrl,
    modSource,
    setSource,
    file,
    gameId,
    gameVersionId,
    selectedGame,
    selectedCategories,
    categorySearch,
    setCategorySearch,
    filteredCategories,
    selectedCategoryObjects,
    toggleCategory: (id: string) => setSelectedCategories((current) => toggleId(current, id)),
    removeCategory: (id: string) => setSelectedCategories((current) => current.filter((currentId) => currentId !== id)),
    selectedDependencies,
    dependencySearch,
    setDependencySearch,
    filteredDependencies,
    selectedDependencyObjects,
    toggleDependency: (id: string) => setSelectedDependencies((current) => toggleId(current, id)),
    removeDependency: (id: string) => setSelectedDependencies((current) => current.filter((currentId) => currentId !== id)),
    selectedIncompatibilities,
    incompatibilitySearch,
    setIncompatibilitySearch,
    filteredIncompatibilities,
    selectedIncompatibilityObjects,
    toggleIncompatibility: (id: string) => setSelectedIncompatibilities((current) => toggleId(current, id)),
    removeIncompatibility: (id: string) => setSelectedIncompatibilities((current) => current.filter((currentId) => currentId !== id)),
    handleGameChange,
    handleGameVersionChange,
    handleFileChange,
    handleSubmit,
  };
}
