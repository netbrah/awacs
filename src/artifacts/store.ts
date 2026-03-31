import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { atomicWrite } from '../utils/atomic-write.js';
import { logger } from '../utils/logger.js';

export class ArtifactStore {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private sortieDir(ticketId: string): string {
    return join(this.baseDir, ticketId);
  }

  async ensureSortieDir(ticketId: string): Promise<string> {
    const dir = this.sortieDir(ticketId);
    await mkdir(dir, { recursive: true });
    logger.debug(`Ensured sortie dir: ${dir}`);
    return dir;
  }

  async writeArtifact(ticketId: string, name: string, content: string): Promise<string> {
    const dir = await this.ensureSortieDir(ticketId);
    const filePath = join(dir, name);
    await atomicWrite(filePath, content);
    logger.info(`Wrote artifact: ${filePath}`);
    return filePath;
  }

  async readArtifact(ticketId: string, name: string): Promise<string | null> {
    const filePath = join(this.sortieDir(ticketId), name);
    if (!existsSync(filePath)) {
      return null;
    }
    return readFile(filePath, 'utf-8');
  }

  async listArtifacts(ticketId: string): Promise<string[]> {
    const dir = this.sortieDir(ticketId);
    if (!existsSync(dir)) {
      return [];
    }
    const entries = await readdir(dir);
    return entries.filter(e => e.endsWith('.md')).sort();
  }

  async artifactExists(ticketId: string, name: string): Promise<boolean> {
    const filePath = join(this.sortieDir(ticketId), name);
    if (!existsSync(filePath)) {
      return false;
    }
    const s = await stat(filePath);
    return s.isFile();
  }

  getArtifactPath(ticketId: string, name: string): string {
    return join(this.sortieDir(ticketId), name);
  }

  getSortieDir(ticketId: string): string {
    return this.sortieDir(ticketId);
  }
}
