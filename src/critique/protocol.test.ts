import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CrossCritiqueProtocol } from './protocol.js';
import { ArtifactStore } from '../artifacts/store.js';
import type { AwacsConfig } from '../config/types.js';

// Mock the OpenAI SDK
vi.mock('openai', () => {
  let callCount = 0;
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: vi.fn().mockImplementation(async () => {
            callCount++;
            return {
              choices: [{ message: { content: `response-${callCount}` } }],
            };
          }),
        },
      };
    },
  };
});

function makeConfig(baseDir: string): AwacsConfig {
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
    artifacts: { baseDir },
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

describe('CrossCritiqueProtocol', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'awacs-critique-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('produces 7 artifacts from a full cycle', async () => {
    const config = makeConfig(tmpDir);
    const protocol = new CrossCritiqueProtocol(config);

    const result = await protocol.runCycle('rca', 'CONTAP-123', 'Investigate issue', 'System prompt');

    // Should produce: 2 drafts + 2 critiques + 2 counters + 1 synthesis = 7
    expect(result.artifacts).toHaveLength(7);
    expect(result.artifacts).toContain('rca-blue-opus46.md');
    expect(result.artifacts).toContain('rca-red-codex53.md');
    expect(result.artifacts).toContain('critique-of-blue-by-red-codex53.md');
    expect(result.artifacts).toContain('critique-of-red-by-blue-opus46.md');
    expect(result.artifacts).toContain('counter-blue-opus46.md');
    expect(result.artifacts).toContain('counter-red-codex53.md');
    expect(result.artifacts).toContain('rca-awacs-synthesis.md');
  });

  it('writes all artifacts to disk', async () => {
    const config = makeConfig(tmpDir);
    const protocol = new CrossCritiqueProtocol(config);
    const store = new ArtifactStore(tmpDir);

    await protocol.runCycle('rca', 'CONTAP-123', 'Investigate issue', 'System prompt');

    const artifacts = await store.listArtifacts('CONTAP-123');
    expect(artifacts.length).toBe(7);
  });

  it('synthesis artifact contains content', async () => {
    const config = makeConfig(tmpDir);
    const protocol = new CrossCritiqueProtocol(config);

    const result = await protocol.runCycle('rca', 'CONTAP-123', 'Investigate issue', 'System prompt');

    expect(result.synthesis).toBeTruthy();
    expect(result.synthesis.length).toBeGreaterThan(0);
  });
});
