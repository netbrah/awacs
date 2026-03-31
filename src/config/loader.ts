import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import YAML from 'yaml';
import type { AwacsConfig, ModelConfig, PhasesConfig, PhaseMode } from './types.js';

const DEFAULT_CONFIG_PATH = join(homedir(), '.awacs', 'config.yaml');

interface RawModelConfig {
  id?: string;
  provider?: string;
  base_url?: string;
  api_key?: string;
}

interface RawConfig {
  models?: {
    blue?: RawModelConfig;
    red?: RawModelConfig;
    arbiter?: RawModelConfig;
  };
  artifacts?: {
    base_dir?: string;
  };
  phases?: Record<string, string>;
  critique?: {
    max_rounds?: number;
    require_citations?: boolean;
  };
}

export function deriveShortName(modelId: string): string {
  // claude-opus-4.6 → opus46, gpt-5.3-codex → codex53
  const parts = modelId.split('-');

  // Find the most distinctive part (not generic prefixes or version numbers)
  const skipPrefixes = ['claude', 'gpt', 'anthropic', 'openai'];
  const meaningful = parts.filter(p =>
    !skipPrefixes.includes(p.toLowerCase()) && !/^[\d.]+$/.test(p),
  );

  if (meaningful.length === 0) {
    return modelId.replace(/[^a-z0-9]/gi, '').slice(0, 10);
  }

  // Take the last meaningful word + all version numbers
  const numbers = modelId.replace(/[^0-9]/g, '');
  const word = meaningful[meaningful.length - 1].toLowerCase();
  return `${word}${numbers}`;
}

function resolveEnvVar(value: string | undefined): string | undefined {
  if (!value) return undefined;
  // Replace ${VAR_NAME} patterns with env var values
  return value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return process.env[varName] ?? '';
  });
}

function buildModelConfig(
  raw: RawModelConfig | undefined,
  envModelId: string | undefined,
  envBaseUrl: string | undefined,
  envApiKey: string | undefined,
): ModelConfig {
  const id = envModelId ?? raw?.id ?? '';
  const baseUrl = envBaseUrl ?? resolveEnvVar(raw?.base_url) ?? process.env['OPENAI_BASE_URL'] ?? 'https://api.openai.com/v1';
  const apiKey = envApiKey ?? resolveEnvVar(raw?.api_key) ?? process.env['OPENAI_API_KEY'] ?? '';

  return {
    id,
    provider: raw?.provider ?? 'openai',
    baseUrl,
    apiKey,
    shortName: deriveShortName(id),
  };
}

interface CliOpts {
  blue?: string;
  red?: string;
  arbiter?: string;
}

export async function loadConfig(cliOpts?: CliOpts): Promise<AwacsConfig> {
  let raw: RawConfig = {};

  const configPath = process.env['AWACS_CONFIG_PATH'] ?? DEFAULT_CONFIG_PATH;
  if (existsSync(configPath)) {
    const content = await readFile(configPath, 'utf-8');
    raw = YAML.parse(content) as RawConfig;
  }

  const blue = buildModelConfig(
    raw.models?.blue,
    cliOpts?.blue ?? process.env['AWACS_BLUE_MODEL'],
    undefined,
    undefined,
  );

  const red = buildModelConfig(
    raw.models?.red,
    cliOpts?.red ?? process.env['AWACS_RED_MODEL'],
    undefined,
    undefined,
  );

  const arbiter = buildModelConfig(
    raw.models?.arbiter,
    cliOpts?.arbiter ?? process.env['AWACS_ARBITER_MODEL'],
    undefined,
    undefined,
  );

  const defaultPhases: PhasesConfig = {
    rca: 'awacs',
    unit_test_plan: 'awacs',
    implement: 'single',
    functional_test_plan: 'awacs',
    vsim: 'single',
    bda: 'single',
    aar: 'single',
  };

  const phases: PhasesConfig = { ...defaultPhases };
  if (raw.phases) {
    for (const [key, value] of Object.entries(raw.phases)) {
      if (key in phases) {
        (phases as unknown as Record<string, PhaseMode>)[key] = value as PhaseMode;
      }
    }
  }

  const artifactsBaseDir = process.env['AWACS_ARTIFACTS_DIR']
    ?? raw.artifacts?.base_dir?.replace('~', homedir())
    ?? join(homedir(), '.skills', 'contaps');

  return {
    models: { blue, red, arbiter },
    artifacts: { baseDir: artifactsBaseDir },
    phases,
    critique: {
      maxRounds: raw.critique?.max_rounds ?? 1,
      requireCitations: raw.critique?.require_citations ?? true,
    },
  };
}
