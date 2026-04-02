import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ModelConfig } from '../../config/types.js';
import { ClaudeCodeHarness } from '../adapters/claude-code.js';
import { CodexHarness } from '../adapters/codex.js';
import { GeminiCliHarness } from '../adapters/gemini-cli.js';
import { QwenCodeHarness } from '../adapters/qwen-code.js';

// ---------------------------------------------------------------------------
// Minimal fake child process
// ---------------------------------------------------------------------------
function makeFakeChild(stdout: string, exitCode: number) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn();

  // Emit stdout + close asynchronously so the Promise chain can set up first
  setImmediate(() => {
    child.stdout.emit('data', Buffer.from(stdout));
    child.emit('close', exitCode);
  });

  return child;
}

// ---------------------------------------------------------------------------
// Spy on node:child_process.spawn
// ---------------------------------------------------------------------------
const spawnMock = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

afterEach(() => {
  spawnMock.mockReset();
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

// ---------------------------------------------------------------------------
// claude-code adapter
// ---------------------------------------------------------------------------
describe('ClaudeCodeHarness', () => {
  it('has name "claude-code"', () => {
    expect(new ClaudeCodeHarness(makeModelConfig()).name).toBe('claude-code');
  });

  it('spawns claude with correct args and returns content', async () => {
    const fakeOutput = JSON.stringify({ result: 'great work' });
    spawnMock.mockReturnValue(makeFakeChild(fakeOutput, 0));

    const h = new ClaudeCodeHarness(makeModelConfig());
    const result = await h.run({ task: 'fix the bug' });

    expect(spawnMock).toHaveBeenCalledOnce();
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('claude');
    expect(args).toContain('-p');
    expect(args).toContain('fix the bug');
    expect(args).toContain('--output-format');
    expect(args).toContain('json');

    expect(result.content).toBe('great work');
    expect(result.exitCode).toBe(0);
  });

  it('uses custom executable from harnessOpts', async () => {
    spawnMock.mockReturnValue(makeFakeChild('plain output', 0));

    const h = new ClaudeCodeHarness(makeModelConfig({ harnessOpts: { executable: '/opt/claude' } }));
    await h.run({ task: 'task' });

    const [cmd] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('/opt/claude');
  });

  it('falls back to raw stdout when output is not JSON', async () => {
    spawnMock.mockReturnValue(makeFakeChild('plain text output', 0));

    const h = new ClaudeCodeHarness(makeModelConfig());
    const result = await h.run({ task: 'task' });
    expect(result.content).toBe('plain text output');
  });
});

// ---------------------------------------------------------------------------
// codex adapter
// ---------------------------------------------------------------------------
describe('CodexHarness', () => {
  it('has name "codex"', () => {
    expect(new CodexHarness(makeModelConfig()).name).toBe('codex');
  });

  it('spawns codex with correct args', async () => {
    spawnMock.mockReturnValue(makeFakeChild(JSON.stringify({ output: 'result' }), 0));

    const h = new CodexHarness(makeModelConfig());
    const result = await h.run({ task: 'do stuff' });

    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('codex');
    expect(args).toContain('--quiet');
    expect(args).toContain('--json');
    expect(args).toContain('-p');
    expect(result.content).toBe('result');
  });
});

// ---------------------------------------------------------------------------
// gemini-cli adapter
// ---------------------------------------------------------------------------
describe('GeminiCliHarness', () => {
  it('has name "gemini-cli"', () => {
    expect(new GeminiCliHarness(makeModelConfig()).name).toBe('gemini-cli');
  });

  it('spawns gemini with correct args', async () => {
    spawnMock.mockReturnValue(makeFakeChild(JSON.stringify({ text: 'answer' }), 0));

    const h = new GeminiCliHarness(makeModelConfig());
    const result = await h.run({ task: 'analyze this' });

    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('gemini');
    expect(args).toContain('-p');
    expect(result.content).toBe('answer');
  });
});

// ---------------------------------------------------------------------------
// qwen-code adapter
// ---------------------------------------------------------------------------
describe('QwenCodeHarness', () => {
  it('has name "qwen-code"', () => {
    expect(new QwenCodeHarness(makeModelConfig()).name).toBe('qwen-code');
  });

  it('spawns qwen-code with correct args', async () => {
    spawnMock.mockReturnValue(makeFakeChild(JSON.stringify({ result: 'done' }), 0));

    const h = new QwenCodeHarness(makeModelConfig());
    const result = await h.run({ task: 'write code' });

    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('qwen-code');
    expect(args).toContain('-p');
    expect(args).toContain('--json');
    expect(result.content).toBe('done');
  });
});
