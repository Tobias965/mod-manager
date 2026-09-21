"use client";

import Link from "next/link";

import BasicInfoFields from "@/components/mods/BasicInfoFields";
import CategorySelector from "@/components/mods/CategorySelector";
import ModPicker from "@/components/mods/ModPicker";
import ModSourceSelector from "@/components/mods/ModSourceSelector";
import { useNewModForm } from "@/components/mods/useNewModForm";

export default function NewModForm() {
  const form = useNewModForm();

  if (form.loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-lg bg-white p-8 text-center shadow">
            <p className="text-gray-600">Cargando formulario...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <Link
            href="/mods/manage/"
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            Volver
          </Link>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Publicar nuevo Mod</h1>
            <p className="mt-1 text-sm text-gray-600">
              Completa la información del mod. Todos los mods serán revisados antes de publicarse.
            </p>
          </div>

          {form.error && (
            <div className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {form.error}
            </div>
          )}
          {form.success && (
            <div className="mb-5 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {form.success}
            </div>
          )}

          <form onSubmit={form.handleSubmit} className="space-y-5">
            <BasicInfoFields
              name={form.name}
              version={form.version}
              license={form.license}
              games={form.games}
              selectedGame={form.selectedGame}
              gameId={form.gameId}
              gameVersionId={form.gameVersionId}
              onNameChange={form.setName}
              onVersionChange={form.setVersion}
              onLicenseChange={form.setLicense}
              onGameChange={form.handleGameChange}
              onGameVersionChange={form.handleGameVersionChange}
            />

            <CategorySelector
              selected={form.selectedCategoryObjects}
              available={form.filteredCategories}
              search={form.categorySearch}
              onSearchChange={form.setCategorySearch}
              onToggle={form.toggleCategory}
              onRemove={form.removeCategory}
            />

            <div className="grid gap-5 lg:grid-cols-2">
              <ModPicker
                title="Dependencias"
                description="Mods necesarios para que este mod funcione."
                emptyMessage="No se encontraron mods compatibles."
                selected={form.selectedDependencyObjects}
                available={form.filteredDependencies}
                search={form.dependencySearch}
                tone="blue"
                onSearchChange={form.setDependencySearch}
                onToggle={form.toggleDependency}
                onRemove={form.removeDependency}
              />
              <ModPicker
                title="Incompatibilidades"
                description="Mods que no deberían utilizarse junto a este mod."
                emptyMessage="No se encontraron mods compatibles."
                selected={form.selectedIncompatibilityObjects}
                available={form.filteredIncompatibilities}
                search={form.incompatibilitySearch}
                tone="red"
                onSearchChange={form.setIncompatibilitySearch}
                onToggle={form.toggleIncompatibility}
                onRemove={form.removeIncompatibility}
              />
            </div>

            <ModSourceSelector
              source={form.modSource}
              file={form.file}
              externalUrl={form.externalUrl}
              onSourceChange={form.setSource}
              onFileChange={form.handleFileChange}
              onExternalUrlChange={form.setExternalUrl}
            />

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-5">
              <Link
                href="/"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={form.submitting || form.games.length === 0 || form.categories.length === 0}
                className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {form.submitting ? "Publicando..." : "Publicar Mod"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
