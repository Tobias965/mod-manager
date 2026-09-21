import type { Mod } from "@/types/mod";

type ModPickerProps = {
  title: string;
  description: string;
  emptyMessage: string;
  selected: Mod[];
  available: Mod[];
  search: string;
  tone: "blue" | "red";
  onSearchChange: (value: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export default function ModPicker({
  title,
  description,
  emptyMessage,
  selected,
  available,
  search,
  tone,
  onSearchChange,
  onToggle,
  onRemove,
}: ModPickerProps) {
  const selectedClass =
    tone === "blue"
      ? "border border-gray-200 border-l-blue-300 bg-gray-50"
      : "border border-gray-200 border-l-rose-300 bg-gray-50";

  return (
    <section className="rounded-md border border-gray-200 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>

      {selected.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-gray-600">Seleccionadas</p>
          <div className="space-y-2">
            {selected.map((mod) => (
              <div
                key={mod.id}
                className={`flex items-center justify-between rounded-md px-3 py-2 ${selectedClass}`}
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{mod.name}</p>
                  <p className="text-xs text-gray-500">v{mod.version}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(mod.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-800"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Buscar mod..."
        className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />

      <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200">
        {available.length === 0 ? (
          <p className="p-3 text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {available.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => onToggle(mod.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
              >
                <span className="text-sm text-gray-800">{mod.name}</span>
                <span className="text-xs text-gray-500">v{mod.version}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
