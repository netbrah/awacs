import type { ModelConfig } from '../config/types.js';
import type { AgentHarness, HarnessName } from './types.js';
import { RawLlmHarness } from './adapters/raw-llm.js';
import { ClaudeCodeHarness } from './adapters/claude-code.js';
import { CodexHarness } from './adapters/codex.js';
import { GeminiCliHarness } from './adapters/gemini-cli.js';
import { QwenCodeHarness } from './adapters/qwen-code.js';

export type { HarnessName };

export function createHarness(name: HarnessName, modelConfig: ModelConfig): AgentHarness {
  switch (name) {
    case 'raw-llm':
      return new RawLlmHarness(modelConfig);
    case 'claude-code':
      return new ClaudeCodeHarness(modelConfig);
    case 'codex':
      return new CodexHarness(modelConfig);
    case 'gemini-cli':
      return new GeminiCliHarness(modelConfig);
    case 'qwen-code':
      return new QwenCodeHarness(modelConfig);
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unknown harness: ${_exhaustive as string}`);
    }
  }
}
