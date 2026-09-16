"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface GameSelectProps {
  games: { id: string; name: string }[];
  selectedGameId: string | undefined;
}

export default function GameSelect({ games, selectedGameId }: GameSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gameId = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (gameId) {
      params.set("gameId", gameId);
    } else {
      params.delete("gameId");
    }
    
    // Actualiza la URL sin recargar toda la página
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <select
      id="gameId"
      name="gameId" // Importante para que formData lo capture
      value={selectedGameId || ""}
      onChange={handleChange}
      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
      required
    >
      <option value="" disabled>
        -- Selecciona un juego --
      </option>
      {games.map((game) => (
        <option key={game.id} value={game.id}>
          {game.name}
        </option>
      ))}
    </select>
  );
}