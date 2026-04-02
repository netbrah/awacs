import { describe, it, expect, vi } from 'vitest';
import { createHarness } from '../registry.js';
import { RawLlmHarness } from '../adapters/raw-llm.js';
import { ClaudeCodeHarness } from '../adapters/claude-code.js';
import { CodexHarness } from '../adapters/codex.js';
import { GeminiCliHarness } from '../adapters/gemini-cli.js';
import { QwenCodeHarness } from '../adapters/qwen-code.js';
import type { ModelConfig } from '../../config/types.js';

// Mock the OpenAI SDK so raw-llm adapter doesn't need real credentials
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

function makeModelConfig(overrides: Partial<ModelConfig> = {}): ModelConfig {
  return {
    id: 'test-model',
    provider: 'openai',
    baseUrl: 'http://localhost:4000',
    apiKey: 'test-key',
    shortName: 'test',
    ...overrides,
  };
}

describe('createHarness registry', () => {
  it('returns RawLlmHarness for raw-llm', () => {
    const h = createHarness('raw-llm', makeModelConfig());
    expect(h).toBeInstanceOf(RawLlmHarness);
    expect(h.name).toBe('raw-llm');
  });

  it('returns ClaudeCodeHarness for claude-code', () => {
    const h = createHarness('claude-code', makeModelConfig());
    expect(h).toBeInstanceOf(ClaudeCodeHarness);
    expect(h.name).toBe('claude-code');
  });

  it('returns CodexHarness for codex', () => {
    const h = createHarness('codex', makeModelConfig());
    expect(h).toBeInstanceOf(CodexHarness);
    expect(h.name).toBe('codex');
  });

  it('returns GeminiCliHarness for gemini-cli', () => {
    const h = createHarness('gemini-cli', makeModelConfig());
    expect(h).toBeInstanceOf(GeminiCliHarness);
    expect(h.name).toBe('gemini-cli');
  });

  it('returns QwenCodeHarness for qwen-code', () => {
    const h = createHarness('qwen-code', makeModelConfig());
    expect(h).toBeInstanceOf(QwenCodeHarness);
    expect(h.name).toBe('qwen-code');
  });

  it('uses executable from harnessOpts when provided', () => {
    const h = createHarness('claude-code', makeModelConfig({
      harnessOpts: { executable: '/usr/local/bin/claude' },
    }));
    expect(h).toBeInstanceOf(ClaudeCodeHarness);
  });
});
