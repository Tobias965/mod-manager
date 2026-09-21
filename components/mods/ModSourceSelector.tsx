import type { ChangeEvent } from "react";
import type { ModSource } from "@/types/mod";

type ModSourceSelectorProps = {
  source: ModSource;
  file: File | null;
  externalUrl: string;
  onSourceChange: (source: ModSource) => void;
  onFileChange: (file: File | null) => void;
  onExternalUrlChange: (value: string) => void;
};

export default function ModSourceSelector({
  source,
  file,
  externalUrl,
  onSourceChange,
  onFileChange,
  onExternalUrlChange,
}: ModSourceSelectorProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
  }

  return (
    <section className="rounded-md border border-gray-200 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Fuente del mod *</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Elige dónde se encuentra el archivo del mod.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ["upload", "Archivo alojado", "Subir el archivo del mod a la plataforma."],
          ["external", "Enlace externo", "El usuario será redirigido al sitio original."],
        ] as const).map(([value, title, description]) => (
          <button
            key={value}
            type="button"
            onClick={() => onSourceChange(value)}
            className={`rounded-md border p-4 text-left transition ${
              source === value
                ? "border-gray-400 bg-gray-100"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          </button>
        ))}
      </div>

      {source === "upload" ? (
        <div key="upload" className="mt-4">
          <label htmlFor="file" className="mb-1.5 block text-sm font-medium text-gray-900">
            Archivo del mod *
          </label>
          <input
            id="file"
            type="file"
            accept=".zip,.jar,.rar,.7z"
            onChange={handleFileChange}
            className="block w-full rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-600 file:mr-4 file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-600"
            required
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600">
              Archivo seleccionado: <span className="font-medium">{file.name}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-gray-500">Formatos permitidos: ZIP, JAR, RAR y 7Z.</p>
          <p className="mt-1 text-xs text-gray-500">Límite de tamaño del archivo: 50 MB.</p>
        </div>
      ) : (
        <div key="external" className="mt-4">
          <label htmlFor="externalUrl" className="mb-1.5 block text-sm font-medium text-gray-900">
            URL del mod *
          </label>
          <input
            id="externalUrl"
            type="url"
            value={externalUrl}
            onChange={(event) => onExternalUrlChange(event.target.value)}
            placeholder="https://www.nexusmods.com/..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Se permiten enlaces de CurseForge, NexusMods, GitHub, Modrinth y Google Drive.
          </p>
        </div>
      )}
    </section>
  );
}
