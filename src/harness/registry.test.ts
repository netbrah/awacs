import { describe, it, expect } from 'vitest';
import { createHarness } from './registry.js';
import { RawLlmHarness } from './adapters/raw-llm.js';
import { ClaudeCodeHarness } from './adapters/claude-code.js';
import { CodexHarness } from './adapters/codex.js';
import { GeminiCliHarness } from './adapters/gemini-cli.js';
import { QwenCodeHarness } from './adapters/qwen-code.js';
import type { ModelConfig } from '../config/types.js';

// Mock OpenAI so RawLlmHarness can be instantiated without real credentials
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'mocked' } }],
          }),
        },
      };
    },
  };
});

import { vi } from 'vitest';

function makeModelConfig(overrides?: Partial<ModelConfig>): ModelConfig {
  return {
    id: 'claude-opus-4.6',
    provider: 'anthropic',
    baseUrl: 'http://localhost:4000',
    apiKey: 'test-key',
    shortName: 'opus46',
    ...overrides,
  };
}

describe('createHarness', () => {
  it('returns RawLlmHarness for "raw-llm"', () => {
    const harness = createHarness('raw-llm', makeModelConfig());
    expect(harness).toBeInstanceOf(RawLlmHarness);
  });

  it('returns ClaudeCodeHarness for "claude-code"', () => {
    const harness = createHarness('claude-code', makeModelConfig());
    expect(harness).toBeInstanceOf(ClaudeCodeHarness);
  });

  it('returns CodexHarness for "codex"', () => {
    const harness = createHarness('codex', makeModelConfig());
    expect(harness).toBeInstanceOf(CodexHarness);
  });

  it('returns GeminiCliHarness for "gemini-cli"', () => {
    const harness = createHarness('gemini-cli', makeModelConfig());
    expect(harness).toBeInstanceOf(GeminiCliHarness);
  });

  it('returns QwenCodeHarness for "qwen-code"', () => {
    const harness = createHarness('qwen-code', makeModelConfig());
    expect(harness).toBeInstanceOf(QwenCodeHarness);
  });

  it('throws for unknown harness type', () => {
    expect(() => createHarness('unknown-agent', makeModelConfig())).toThrow(
      'Unknown harness type: "unknown-agent"',
    );
  });

  it('throws error that lists known types', () => {
    expect(() => createHarness('bad-type', makeModelConfig())).toThrow(
      'raw-llm, claude-code, codex, gemini-cli, qwen-code',
    );
  });

  it('passes harnessOpts to CLI adapters', () => {
    const config = makeModelConfig({
      harness: 'claude-code',
      harnessOpts: { command: '/usr/local/bin/claude', cwd: '/repo', timeout: 600 },
    });
    const harness = createHarness('claude-code', config);
    expect(harness).toBeInstanceOf(ClaudeCodeHarness);
  });
});
