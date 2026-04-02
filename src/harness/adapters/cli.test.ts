import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { ClaudeCodeHarness } from './claude-code.js';
import { CodexHarness } from './codex.js';
import { GeminiCliHarness } from './gemini-cli.js';
import { QwenCodeHarness } from './qwen-code.js';
import { extractJsonlContent } from './cli-base.js';

// ---------------------------------------------------------------------------
// Mock child_process.spawn
// ---------------------------------------------------------------------------
const mockProc = {
  stdout: new EventEmitter(),
  stderr: new EventEmitter(),
  stdin: { end: vi.fn() },
  kill: vi.fn(),
  on: vi.fn(),
};

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => mockProc),
}));

import { spawn } from 'node:child_process';
const mockSpawn = vi.mocked(spawn);

// Helper: resolve the process with given stdout after mock setup
function resolveProcess(stdout: string, exitCode = 0): void {
  // Emit stdout data then close event
  setImmediate(() => {
    mockProc.stdout.emit('data', Buffer.from(stdout));
    // Find the 'close' handler registered via proc.on('close', ...)
    const closeHandler = (mockProc.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === 'close',
    )?.[1] as ((code: number) => void) | undefined;
    closeHandler?.(exitCode);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockProc.stdout = new EventEmitter();
  mockProc.stderr = new EventEmitter();
  mockProc.on = vi.fn();
});

// ---------------------------------------------------------------------------
// extractJsonlContent unit tests
// ---------------------------------------------------------------------------
describe('extractJsonlContent', () => {
  it('extracts result field from JSONL result line', () => {
    const raw = JSON.stringify({ type: 'result', subtype: 'success', result: 'final answer' });
    expect(extractJsonlContent(raw)).toBe('final answer');
  });

  it('extracts last assistant message from JSONL stream', () => {
    const lines = [
      JSON.stringify({ type: 'system', subtype: 'init' }),
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'assistant says this' }] },
      }),
    ];
    expect(extractJsonlContent(lines.join('\n'))).toBe('assistant says this');
  });

  it('falls back to raw string when no recognisable JSON', () => {
    const raw = 'just plain text output';
    expect(extractJsonlContent(raw)).toBe('just plain text output');
  });

  it('prefers result type over assistant type', () => {
    const lines = [
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'text', text: 'intermediate' }] },
      }),
      JSON.stringify({ type: 'result', result: 'final result' }),
    ];
    expect(extractJsonlContent(lines.join('\n'))).toBe('final result');
  });
});

// ---------------------------------------------------------------------------
// ClaudeCodeHarness
// ---------------------------------------------------------------------------
describe('ClaudeCodeHarness', () => {
  it('builds correct args with default command', () => {
    const harness = new ClaudeCodeHarness({});
    const args = harness.buildArgs({ task: 'fix the bug' });
    expect(args).toEqual(['-p', 'fix the bug', '--json']);
  });

  it('uses custom command from config', () => {
    const harness = new ClaudeCodeHarness({ command: '/usr/local/bin/claude' });
    resolveProcess(JSON.stringify({ type: 'result', result: 'done' }));
    const runPromise = harness.run({ task: 'test task' });
    return runPromise.then(result => {
      expect(mockSpawn).toHaveBeenCalledWith(
        '/usr/local/bin/claude',
        expect.arrayContaining(['-p', 'test task', '--json']),
        expect.any(Object),
      );
      expect(result.content).toBe('done');
    });
  });

  it('appends extra args from config', () => {
    const harness = new ClaudeCodeHarness({ args: ['--no-color'] });
    const args = harness.buildArgs({ task: 'my task' });
    // buildArgs itself doesn't include config.args — that's added in run()
    expect(args).toEqual(['-p', 'my task', '--json']);
  });
});

// ---------------------------------------------------------------------------
// CodexHarness
// ---------------------------------------------------------------------------
describe('CodexHarness', () => {
  it('builds correct args', () => {
    const harness = new CodexHarness({});
    expect(harness.buildArgs({ task: 'write tests' })).toEqual([
      '--quiet',
      '--json',
      '-p',
      'write tests',
    ]);
  });
});

// ---------------------------------------------------------------------------
// GeminiCliHarness
// ---------------------------------------------------------------------------
describe('GeminiCliHarness', () => {
  it('builds correct args', () => {
    const harness = new GeminiCliHarness({});
    expect(harness.buildArgs({ task: 'explain this code' })).toEqual([
      '-p',
      'explain this code',
    ]);
  });
});

// ---------------------------------------------------------------------------
// QwenCodeHarness
// ---------------------------------------------------------------------------
describe('QwenCodeHarness', () => {
  it('builds correct args', () => {
    const harness = new QwenCodeHarness({});
    expect(harness.buildArgs({ task: 'refactor function' })).toEqual([
      '-p',
      'refactor function',
      '--json',
    ]);
  });
});
