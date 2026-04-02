import { describe, it, expect, vi } from 'vitest';
import { RawLlmHarness } from './raw-llm.js';
import type { ModelConfig } from '../../config/types.js';

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'llm response text' } }],
          }),
        },
      };
    },
  };
});

function makeModelConfig(): ModelConfig {
  return {
    id: 'claude-opus-4.6',
    provider: 'anthropic',
    baseUrl: 'http://localhost:4000',
    apiKey: 'test-key',
    shortName: 'opus46',
  };
}

describe('RawLlmHarness', () => {
  it('delegates to ModelClient and returns content', async () => {
    const harness = new RawLlmHarness(makeModelConfig());
    const result = await harness.run({ task: 'do something' });
    expect(result.content).toBe('llm response text');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('passes systemPrompt to ModelClient', async () => {
    const harness = new RawLlmHarness(makeModelConfig());
    const result = await harness.run({ task: 'my task', systemPrompt: 'you are an expert' });
    expect(result.content).toBe('llm response text');
  });

  it('uses empty string for systemPrompt when not provided', async () => {
    const harness = new RawLlmHarness(makeModelConfig());
    const result = await harness.run({ task: 'just a task' });
    expect(result.content).toBe('llm response text');
  });
});
