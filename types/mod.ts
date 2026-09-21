export type GameVersion = {
  id: string;
  version: string;
};

export type Game = {
  id: string;
  name: string;
  versions: GameVersion[];
};

export type Category = {
  id: string;
  name: string;
};

export type Mod = {
  id: string;
  name: string;
  version: string;
  gameId: string;
  gameVersionId: string;
};

export type ModSource = "upload" | "external";

export type ModsPageData = {
  games?: Game[];
  categories?: Category[];
  mods?: Mod[];
  error?: string;
};
