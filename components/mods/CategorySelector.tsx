import type { Category } from "@/types/mod";

type CategorySelectorProps = {
  selected: Category[];
  available: Category[];
  search: string;
  onSearchChange: (value: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function CategorySelector({
  selected,
  available,
  search,
  onSearchChange,
  onToggle,
  onRemove,
}: CategorySelectorProps) {
  return (
    <section className="rounded-md border border-gray-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Categorías *</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Selecciona una o más categorías.
          </p>
        </div>
        <span className="text-xs text-gray-500">{selected.length} seleccionadas</span>
      </div>

      {selected.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Seleccionadas</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onRemove(category.id)}
                className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200"
              >
                {category.name}<span className="ml-1.5">x</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar categoría..."
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />

      <div className="max-h-36 overflow-y-auto rounded-md border border-gray-200">
        {available.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">No se encontraron categorías.</p>
        ) : (
          <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => onToggle(category.id)}
                className="rounded-md border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 hover:border-blue-300 hover:bg-blue-50"
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
