import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SortieState } from './sortie.js';

describe('SortieState', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'awacs-state-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('initializes with all phases pending', async () => {
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
    const state = new SortieState('CONTAP-123', tmpDir);
    await state.initialize({ blue: 'opus', red: 'codex', arbiter: 'opus' });

    expect(state.getPhase('rca')).toBe('pending');
    expect(state.getPhase('implement')).toBe('pending');
    expect(state.getPhase('aar')).toBe('pending');
  });

  it('updates phase status and persists', async () => {
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
    const state = new SortieState('CONTAP-123', tmpDir);
    await state.initialize({ blue: 'opus', red: 'codex', arbiter: 'opus' });

    await state.updatePhase('rca', 'dispatched');
    expect(state.getPhase('rca')).toBe('dispatched');

    // Load from disk into new instance
    const state2 = new SortieState('CONTAP-123', tmpDir);
    await state2.load();
    expect(state2.getPhase('rca')).toBe('dispatched');
  });

  it('tracks model assignments', async () => {
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
    const state = new SortieState('CONTAP-123', tmpDir);
    await state.initialize({ blue: 'claude-opus-4.6', red: 'gpt-5.3-codex', arbiter: 'claude-opus-4.6' });

    const s = state.getState();
    expect(s.models.blue).toBe('claude-opus-4.6');
    expect(s.models.red).toBe('gpt-5.3-codex');
    expect(s.models.arbiter).toBe('claude-opus-4.6');
  });

  it('finds next pending phase', async () => {
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
    const state = new SortieState('CONTAP-123', tmpDir);
    await state.initialize({ blue: 'opus', red: 'codex', arbiter: 'opus' });

    expect(state.getNextPendingPhase()).toBe('rca');

    await state.updatePhase('rca', 'complete');
    expect(state.getNextPendingPhase()).toBe('unit_test_plan');
  });

  it('finds last completed phase', async () => {
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
    const state = new SortieState('CONTAP-123', tmpDir);
    await state.initialize({ blue: 'opus', red: 'codex', arbiter: 'opus' });

    expect(state.getLastCompletedPhase()).toBeNull();

    await state.updatePhase('rca', 'complete');
    await state.updatePhase('unit_test_plan', 'complete');
    expect(state.getLastCompletedPhase()).toBe('unit_test_plan');
  });

  it('detects complete sortie', async () => {
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
    const state = new SortieState('CONTAP-123', tmpDir);
    await state.initialize({ blue: 'opus', red: 'codex', arbiter: 'opus' });

    expect(state.isComplete()).toBe(false);

    const phases = ['rca', 'unit_test_plan', 'implement', 'functional_test_plan', 'vsim', 'bda', 'aar'] as const;
    for (const p of phases) {
      await state.updatePhase(p, 'complete');
    }
    expect(state.isComplete()).toBe(true);
  });

  it('treats skipped phases as complete for isComplete', async () => {
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
    const state = new SortieState('CONTAP-123', tmpDir);
    await state.initialize({ blue: 'opus', red: 'codex', arbiter: 'opus' });

    const phases = ['rca', 'unit_test_plan', 'implement', 'functional_test_plan', 'vsim', 'bda', 'aar'] as const;
    for (const p of phases) {
      await state.updatePhase(p, p === 'implement' ? 'skipped' : 'complete');
    }
    expect(state.isComplete()).toBe(true);
  });

  it('reloads existing state on re-init', async () => {
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
    const state1 = new SortieState('CONTAP-123', tmpDir);
    await state1.initialize({ blue: 'opus', red: 'codex', arbiter: 'opus' });
    await state1.updatePhase('rca', 'complete');

    // Re-initialize (should load existing)
    const state2 = new SortieState('CONTAP-123', tmpDir);
    await state2.initialize({ blue: 'opus', red: 'codex', arbiter: 'opus' });
    expect(state2.getPhase('rca')).toBe('complete');
  });
});
