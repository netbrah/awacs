import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CopIndex } from './cop-index.js';

describe('CopIndex', () => {
  let tmpDir: string;
  let copIndex: CopIndex;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'awacs-cop-test-'));
    copIndex = new CopIndex(tmpDir);
    await mkdir(join(tmpDir, 'CONTAP-123'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates COP.md on first update', async () => {
    await copIndex.update('CONTAP-123', 'rca', 'complete', 'rca-awacs-synthesis.md', '[2 HIGH, 1 MEDIUM]');

    const content = await copIndex.read('CONTAP-123');
    expect(content).toContain('# COP — CONTAP-123');
    expect(content).toContain('Updated:');
    expect(content).toContain('## Phases');
    expect(content).toContain('| rca | complete | rca-awacs-synthesis.md | [2 HIGH, 1 MEDIUM] |');
  });

  it('updates existing phase row', async () => {
    await copIndex.update('CONTAP-123', 'rca', 'dispatched', null, '—');
    await copIndex.update('CONTAP-123', 'rca', 'complete', 'rca-awacs-synthesis.md', '[2 HIGH]');

    const content = await copIndex.read('CONTAP-123');
    expect(content).toContain('| rca | complete | rca-awacs-synthesis.md | [2 HIGH] |');
    // Should not contain the old dispatched row
    expect(content).not.toContain('dispatched');
  });

  it('tracks multiple phases', async () => {
    await copIndex.update('CONTAP-123', 'rca', 'complete', 'rca-awacs-synthesis.md', '[2 HIGH]');
    await copIndex.update('CONTAP-123', 'utp', 'complete', 'utp-awacs-synthesis.md', '[3 test suites]');
    await copIndex.update('CONTAP-123', 'implement', 'pending', null, '—');

    const content = await copIndex.read('CONTAP-123');
    expect(content).toContain('| rca |');
    expect(content).toContain('| utp |');
    expect(content).toContain('| implement | pending | — | — |');
  });

  it('returns empty string for non-existent ticket', async () => {
    const content = await copIndex.read('NONEXISTENT');
    expect(content).toBe('');
  });

  it('adds artifacts to the list', async () => {
    await copIndex.update('CONTAP-123', 'rca', 'complete', 'rca-awacs-synthesis.md', '[2 HIGH]');
    await copIndex.addArtifact('CONTAP-123', 'rca-awacs-synthesis.md', 14540, 'merged RCA, 2 high-confidence findings');

    const content = await copIndex.read('CONTAP-123');
    expect(content).toContain('## Artifacts');
    expect(content).toContain('rca-awacs-synthesis.md (14.2KB) — merged RCA, 2 high-confidence findings');
  });

  it('updates existing artifact entry', async () => {
    await copIndex.addArtifact('CONTAP-123', 'rca-awacs-synthesis.md', 10240, 'draft');
    await copIndex.addArtifact('CONTAP-123', 'rca-awacs-synthesis.md', 14540, 'final merged RCA');

    const content = await copIndex.read('CONTAP-123');
    // Should have the updated entry, not the old one
    expect(content).toContain('14.2KB');
    expect(content).toContain('final merged RCA');
    expect(content).not.toContain('draft');
  });

  it('adds multiple artifacts', async () => {
    await copIndex.addArtifact('CONTAP-123', 'rca-awacs-synthesis.md', 14540, 'merged RCA');
    await copIndex.addArtifact('CONTAP-123', '_raw/rca-blue-opus46.md', 8192, 'archived draft');

    const content = await copIndex.read('CONTAP-123');
    expect(content).toContain('rca-awacs-synthesis.md');
    expect(content).toContain('_raw/rca-blue-opus46.md');
  });

  it('preserves artifacts when updating phases', async () => {
    await copIndex.addArtifact('CONTAP-123', 'rca-awacs-synthesis.md', 14540, 'merged RCA');
    await copIndex.update('CONTAP-123', 'rca', 'complete', 'rca-awacs-synthesis.md', '[2 HIGH]');

    const content = await copIndex.read('CONTAP-123');
    expect(content).toContain('## Artifacts');
    expect(content).toContain('rca-awacs-synthesis.md (14.2KB) — merged RCA');
    expect(content).toContain('| rca | complete |');
  });

  it('handles null synthesis file with em-dash', async () => {
    await copIndex.update('CONTAP-123', 'implement', 'pending', null, '—');

    const content = await copIndex.read('CONTAP-123');
    expect(content).toContain('| implement | pending | — | — |');
  });
});
