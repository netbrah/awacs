import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { GateChecker } from './gates.js';
import { ArtifactStore } from '../artifacts/store.js';

describe('GateChecker', () => {
  let tmpDir: string;
  let store: ArtifactStore;
  let gates: GateChecker;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'awacs-gate-test-'));
    store = new ArtifactStore(tmpDir);
    gates = new GateChecker(store);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('passes when synthesis artifact exists', async () => {
    await store.writeArtifact('CONTAP-123', 'rca-awacs-synthesis.md', 'synthesis content');
    const result = await gates.checkSynthesisExists('CONTAP-123', 'rca');
    expect(result.passed).toBe(true);
  });

  it('fails when synthesis artifact is missing', async () => {
    await store.ensureSortieDir('CONTAP-123');
    const result = await gates.checkSynthesisExists('CONTAP-123', 'rca');
    expect(result.passed).toBe(false);
  });

  it('passes for phases without synthesis artifacts (implement)', async () => {
    const result = await gates.checkSynthesisExists('CONTAP-123', 'implement');
    expect(result.passed).toBe(true);
  });

  it('checks dependencies are satisfied', async () => {
    await store.writeArtifact('CONTAP-123', 'rca-awacs-synthesis.md', 'rca');
    const result = await gates.checkDependencies('CONTAP-123', 'unit_test_plan');
    expect(result.passed).toBe(true);
  });

  it('fails when dependencies are missing', async () => {
    await store.ensureSortieDir('CONTAP-123');
    const result = await gates.checkDependencies('CONTAP-123', 'unit_test_plan');
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('rca');
  });

  it('passes for phases with no dependencies (rca)', async () => {
    const result = await gates.checkDependencies('CONTAP-123', 'rca');
    expect(result.passed).toBe(true);
  });
});
