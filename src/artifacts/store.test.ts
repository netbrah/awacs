import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ArtifactStore } from './store.js';

describe('ArtifactStore', () => {
  let tmpDir: string;
  let store: ArtifactStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'awacs-test-'));
    store = new ArtifactStore(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates sortie directory', async () => {
    const dir = await store.ensureSortieDir('CONTAP-123');
    expect(dir).toBe(join(tmpDir, 'CONTAP-123'));
  });

  it('writes and reads artifact', async () => {
    await store.writeArtifact('CONTAP-123', 'rca-blue-opus46.md', '# RCA Draft\nRoot cause is X');
    const content = await store.readArtifact('CONTAP-123', 'rca-blue-opus46.md');
    expect(content).toBe('# RCA Draft\nRoot cause is X');
  });

  it('returns null for non-existent artifact', async () => {
    const content = await store.readArtifact('CONTAP-123', 'does-not-exist.md');
    expect(content).toBeNull();
  });

  it('lists markdown artifacts', async () => {
    await store.writeArtifact('CONTAP-123', 'rca-blue-opus46.md', 'blue draft');
    await store.writeArtifact('CONTAP-123', 'rca-red-codex53.md', 'red draft');
    await store.writeArtifact('CONTAP-123', 'sortie-state.yaml', 'yaml data');

    const artifacts = await store.listArtifacts('CONTAP-123');
    expect(artifacts).toEqual(['rca-blue-opus46.md', 'rca-red-codex53.md']);
  });

  it('returns empty list for non-existent ticket', async () => {
    const artifacts = await store.listArtifacts('NONEXISTENT');
    expect(artifacts).toEqual([]);
  });

  it('checks artifact existence', async () => {
    await store.writeArtifact('CONTAP-123', 'test.md', 'content');
    expect(await store.artifactExists('CONTAP-123', 'test.md')).toBe(true);
    expect(await store.artifactExists('CONTAP-123', 'nope.md')).toBe(false);
  });

  it('overwrites existing artifact atomically', async () => {
    await store.writeArtifact('CONTAP-123', 'rca.md', 'version 1');
    await store.writeArtifact('CONTAP-123', 'rca.md', 'version 2');
    const content = await store.readArtifact('CONTAP-123', 'rca.md');
    expect(content).toBe('version 2');
  });

  it('returns correct artifact path', () => {
    const path = store.getArtifactPath('CONTAP-123', 'rca.md');
    expect(path).toBe(join(tmpDir, 'CONTAP-123', 'rca.md'));
  });
});
