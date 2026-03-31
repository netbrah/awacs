import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AwacsDispatcher } from './dispatcher.js';
import type { AwacsConfig } from '../config/types.js';

// Mock the OpenAI SDK
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [{ message: { content: 'mocked response' } }],
          }),
        },
      };
    },
  };
});

function makeConfig(): AwacsConfig {
  return {
    models: {
      blue: {
        id: 'claude-opus-4.6',
        provider: 'anthropic',
        baseUrl: 'http://localhost:4000',
        apiKey: 'test-key',
        shortName: 'opus46',
      },
      red: {
        id: 'gpt-5.3-codex',
        provider: 'openai',
        baseUrl: 'http://localhost:4000',
        apiKey: 'test-key',
        shortName: 'codex53',
      },
      arbiter: {
        id: 'claude-opus-4.6',
        provider: 'anthropic',
        baseUrl: 'http://localhost:4000',
        apiKey: 'test-key',
        shortName: 'opus46',
      },
    },
    artifacts: { baseDir: '/tmp/awacs-test' },
    phases: {
      rca: 'awacs',
      unit_test_plan: 'awacs',
      implement: 'single',
      functional_test_plan: 'awacs',
      vsim: 'single',
      bda: 'single',
      aar: 'single',
    },
    critique: { maxRounds: 1, requireCitations: true },
  };
}

describe('AwacsDispatcher', () => {
  let dispatcher: AwacsDispatcher;

  beforeEach(() => {
    dispatcher = new AwacsDispatcher(makeConfig());
  });

  it('dispatches to blue and red in parallel', async () => {
    const result = await dispatcher.dispatchParallel('system prompt', 'user message');
    expect(result.blue.content).toBe('mocked response');
    expect(result.red.content).toBe('mocked response');
    expect(result.blue.role).toBe('blue');
    expect(result.red.role).toBe('red');
  });

  it('dispatches to a single model', async () => {
    const result = await dispatcher.dispatchSingle('blue', 'system', 'user');
    expect(result.content).toBe('mocked response');
    expect(result.role).toBe('blue');
  });

  it('dispatches to arbiter', async () => {
    const result = await dispatcher.dispatchSingle('arbiter', 'system', 'user');
    expect(result.content).toBe('mocked response');
    expect(result.role).toBe('arbiter');
  });
});
