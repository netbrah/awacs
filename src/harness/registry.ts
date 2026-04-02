import type { AgentHarness } from './types.js';
import type { ModelConfig } from '../config/types.js';
import { RawLlmHarness } from './adapters/raw-llm.js';
import { ClaudeCodeHarness } from './adapters/claude-code.js';
import { CodexHarness } from './adapters/codex.js';
import { GeminiCliHarness } from './adapters/gemini-cli.js';
import { QwenCodeHarness } from './adapters/qwen-code.js';

const KNOWN_TYPES = ['raw-llm', 'claude-code', 'codex', 'gemini-cli', 'qwen-code'] as const;

export function createHarness(type: string, config: ModelConfig): AgentHarness {
  const harnessConfig = config.harnessOpts ?? {};

  switch (type) {
    case 'raw-llm':
      return new RawLlmHarness(config);
    case 'claude-code':
      return new ClaudeCodeHarness(harnessConfig);
    case 'codex':
      return new CodexHarness(harnessConfig);
    case 'gemini-cli':
      return new GeminiCliHarness(harnessConfig);
    case 'qwen-code':
      return new QwenCodeHarness(harnessConfig);
    default:
      throw new Error(
        `Unknown harness type: "${type}". Known types: ${KNOWN_TYPES.join(', ')}`,
      );
  }
}
