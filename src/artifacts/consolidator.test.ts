import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { SortieConsolidator } from './consolidator.js';
import { CopIndex } from './cop-index.js';

describe('SortieConsolidator', () => {
  let tmpDir: string;
  let consolidator: SortieConsolidator;
  const ticketId = 'CONTAP-123';

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'awacs-consolidate-test-'));
    consolidator = new SortieConsolidator(tmpDir);

    // Set up a sortie directory with typical artifacts
    const sortieDir = join(tmpDir, ticketId);
    await mkdir(sortieDir, { recursive: true });

    // Synthesis files (should be kept)
    await writeFile(join(sortieDir, 'rca-awacs-synthesis.md'), 'RCA synthesis content');
    await writeFile(join(sortieDir, 'unit_test_plan-awacs-synthesis.md'), 'UTP synthesis content');

    // Blue/red drafts (should be archived)
    await writeFile(join(sortieDir, 'rca-blue-opus46.md'), 'Blue RCA draft');
    await writeFile(join(sortieDir, 'rca-red-codex53.md'), 'Red RCA draft');

    // Critique files (should be archived)
    await writeFile(join(sortieDir, 'critique-of-blue-by-red-codex53.md'), 'Critique content');
    await writeFile(join(sortieDir, 'critique-of-red-by-blue-opus46.md'), 'Critique content');

    // Counter files (should be archived)
    await writeFile(join(sortieDir, 'counter-blue-opus46.md'), 'Counter content');
    await writeFile(join(sortieDir, 'counter-red-codex53.md'), 'Counter content');

    // COP.md (should be kept — excluded from processing)
    await writeFile(join(sortieDir, 'COP.md'), '# COP — CONTAP-123');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('archives intermediate files and keeps syntheses', async () => {
    const result = await consolidator.consolidate(ticketId);

    expect(result.kept).toContain('rca-awacs-synthesis.md');
    expect(result.kept).toContain('unit_test_plan-awacs-synthesis.md');
    expect(result.archived).toContain('rca-blue-opus46.md');
    expect(result.archived).toContain('rca-red-codex53.md');
    expect(result.archived).toContain('critique-of-blue-by-red-codex53.md');
    expect(result.archived).toContain('critique-of-red-by-blue-opus46.md');
    expect(result.archived).toContain('counter-blue-opus46.md');
    expect(result.archived).toContain('counter-red-codex53.md');
  });

  it('moves archived files to _raw/ directory', async () => {
    await consolidator.consolidate(ticketId);

    const rawDir = join(tmpDir, ticketId, '_raw');
    expect(existsSync(rawDir)).toBe(true);

    const rawFiles = await readdir(rawDir);
    expect(rawFiles).toContain('rca-blue-opus46.md');
    expect(rawFiles).toContain('counter-red-codex53.md');

    // Verify file content is preserved
    const content = await readFile(join(rawDir, 'rca-blue-opus46.md'), 'utf-8');
    expect(content).toBe('Blue RCA draft');
  });

  it('keeps synthesis files in top-level directory', async () => {
    await consolidator.consolidate(ticketId);

    const sortieDir = join(tmpDir, ticketId);
    const topFiles = await readdir(sortieDir);
    expect(topFiles).toContain('rca-awacs-synthesis.md');
    expect(topFiles).toContain('unit_test_plan-awacs-synthesis.md');

    // Archived files should NOT be in top-level anymore
    expect(topFiles).not.toContain('rca-blue-opus46.md');
    expect(topFiles).not.toContain('counter-blue-opus46.md');
  });

  it('reports space saved', async () => {
    const result = await consolidator.consolidate(ticketId);
    expect(result.spaceSaved).toBeGreaterThan(0);
  });

  it('updates COP index with _raw/ prefix for archived files', async () => {
    await consolidator.consolidate(ticketId);

    const copIndex = new CopIndex(tmpDir);
    const copContent = await copIndex.read(ticketId);
    expect(copContent).toContain('_raw/rca-blue-opus46.md');
    expect(copContent).toContain('_raw/counter-blue-opus46.md');
  });

  it('is idempotent — second consolidation is a no-op', async () => {
    const result1 = await consolidator.consolidate(ticketId);
    expect(result1.archived.length).toBeGreaterThan(0);

    // Second run: intermediates already moved, nothing to archive
    const result2 = await consolidator.consolidate(ticketId);
    expect(result2.archived.length).toBe(0);
    expect(result2.kept).toContain('rca-awacs-synthesis.md');
  });

  it('detects consolidated state', async () => {
    expect(await consolidator.isConsolidated(ticketId)).toBe(false);
    await consolidator.consolidate(ticketId);
    expect(await consolidator.isConsolidated(ticketId)).toBe(true);
  });

  it('throws for non-existent sortie directory', async () => {
    await expect(consolidator.consolidate('NONEXISTENT')).rejects.toThrow('Sortie directory not found');
  });
});
