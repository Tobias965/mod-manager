export interface ModpackDTO {
  game: {
    name: string;
    loader: string;
    version: string;
  };

  mods: {
    id: string;
    name: string;
    version: string;
    dependencies: string[];
    incompatibilities: string[];
  }[];
}

export interface CompatibilityReport {
  compatible: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface ICompatibilityEngine {
  analyze(
    modpackData: ModpackDTO
  ): Promise<CompatibilityReport>;
}