import { describe, it, expect, vi } from 'vitest';
import { RawLlmHarness } from '../adapters/raw-llm.js';
import type { ModelConfig } from '../../config/types.js';

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'raw llm response' } }],
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

describe('RawLlmHarness', () => {
  it('has name "raw-llm"', () => {
    const h = new RawLlmHarness(makeModelConfig());
    expect(h.name).toBe('raw-llm');
  });

  it('run() returns HarnessResult with content from ModelClient', async () => {
    const h = new RawLlmHarness(makeModelConfig());
    const result = await h.run({ task: 'do something', systemPrompt: 'you are helpful' });

    expect(result.content).toBe('raw llm response');
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('run() works with no systemPrompt', async () => {
    const h = new RawLlmHarness(makeModelConfig());
    const result = await h.run({ task: 'just a task' });
    expect(result.content).toBe('raw llm response');
    expect(result.exitCode).toBe(0);
  });

  it('exposes getModelId()', () => {
    const h = new RawLlmHarness(makeModelConfig({ id: 'my-model' }));
    expect(h.getModelId()).toBe('my-model');
  });
});
