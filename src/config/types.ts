export interface ModelConfig {
  id: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  shortName: string;
  harness?: string;
  harnessOpts?: {
    command?: string;
    args?: string[];
    cwd?: string;
    timeout?: number;
  };
}

export type PhaseMode = 'awacs' | 'single';

export interface PhasesConfig {
  rca: PhaseMode;
  unit_test_plan: PhaseMode;
  implement: PhaseMode;
  functional_test_plan: PhaseMode;
  vsim: PhaseMode;
  bda: PhaseMode;
  aar: PhaseMode;
}

export interface CritiqueConfig {
  maxRounds: number;
  requireCitations: boolean;
}

export interface AwacsConfig {
  models: {
    blue: ModelConfig;
    red: ModelConfig;
    arbiter: ModelConfig;
  };
  artifacts: {
    baseDir: string;
  };
  phases: PhasesConfig;
  critique: CritiqueConfig;
}
