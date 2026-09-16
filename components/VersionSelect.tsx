"use client";

import { useRouter } from "next/navigation";

type Version = {
  id: string;
  version: string;
};

type VersionSelectProps = {
  gameId: string;
  versions: Version[];
  selectedVersionId?: string;
};

export default function VersionSelect({
  gameId,
  versions,
  selectedVersionId,
}: VersionSelectProps) {
  const router = useRouter();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const versionId = event.target.value;

    if (!gameId) {
      return;
    }

    const params = new URLSearchParams();

    params.set("gameId", gameId);

    if (versionId) {
      params.set("versionId", versionId);
    }

    router.push(`/modpacks/create?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="versionId"
        className="block text-sm font-medium text-gray-700"
      >
        Versión del juego
      </label>

      <select
        id="versionId"
        name="gameVersionId"
        value={selectedVersionId ?? ""}
        onChange={handleChange}
        disabled={versions.length === 0}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-black focus:ring-1 focus:ring-black disabled:cursor-not-allowed disabled:bg-gray-100"
      >
        <option value="">
          {versions.length === 0
            ? "No hay versiones disponibles"
            : "Seleccioná una versión"}
        </option>

        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {version.version}
          </option>
        ))}
      </select>
    </div>
  );
}