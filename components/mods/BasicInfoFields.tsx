import type { Game } from "@/types/mod";

type BasicInfoFieldsProps = {
  name: string;
  version: string;
  license: string;
  games: Game[];
  selectedGame?: Game;
  gameId: string;
  gameVersionId: string;
  onNameChange: (value: string) => void;
  onVersionChange: (value: string) => void;
  onLicenseChange: (value: string) => void;
  onGameChange: (value: string) => void;
  onGameVersionChange: (value: string) => void;
};

const inputClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export default function BasicInfoFields({
  name,
  version,
  license,
  games,
  selectedGame,
  gameId,
  gameVersionId,
  onNameChange,
  onVersionChange,
  onLicenseChange,
  onGameChange,
  onGameVersionChange,
}: BasicInfoFieldsProps) {
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-900">
          Nombre del mod *
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="Ej. Better Vehicles"
            className={`${inputClass} mt-1.5 font-normal`}
            required
          />
        </label>

        <label className="text-sm font-medium text-gray-900">
          Versión del mod *
          <input
            id="version"
            type="text"
            value={version}
            onChange={(event) => onVersionChange(event.target.value)}
            placeholder="Ej. 1.2.0"
            className={`${inputClass} mt-1.5 font-normal`}
            required
          />
        </label>

        <label className="text-sm font-medium text-gray-900">
          Juego *
          <select
            id="gameId"
            value={gameId}
            onChange={(event) => onGameChange(event.target.value)}
            className={`${inputClass} mt-1.5 bg-white font-normal`}
            required
          >
            <option value="">Selecciona un juego</option>
            {games.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-gray-900">
          Versión del juego *
          <select
            id="gameVersionId"
            value={gameVersionId}
            onChange={(event) => onGameVersionChange(event.target.value)}
            disabled={!gameId || !selectedGame}
            className={`${inputClass} mt-1.5 bg-white font-normal disabled:bg-gray-100`}
            required
          >
            <option value="">
              {!gameId ? "Primero selecciona un juego" : "Selecciona una versión"}
            </option>
            {selectedGame?.versions.map((gameVersion) => (
              <option key={gameVersion.id} value={gameVersion.id}>
                {gameVersion.version}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-900">
        Licencia
        <select
          id="license"
          value={license}
          onChange={(event) => onLicenseChange(event.target.value)}
          className={`${inputClass} mt-1.5 bg-white font-normal`}
        >
          <option value="CC-BY-NC-4.0">Creative Commons - No comercial</option>
          <option value="ARR">Todos los derechos reservados</option>
          <option value="MIT">MIT (Código abierto permisivo)</option>
        </select>
        <span className="mt-1 block text-xs font-normal text-gray-500">
          La licencia indica las condiciones bajo las que se distribuye el mod.
        </span>
      </label>
    </>
  );
}
