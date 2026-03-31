import { readdir, mkdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { CopIndex } from './cop-index.js';
import { logger } from '../utils/logger.js';

const RAW_DIR = '_raw';

const SYNTHESIS_PATTERN = /-awacs-synthesis\.md$/;
const INTERMEDIATE_PATTERNS = [
  /-blue-.*\.md$/,
  /-red-.*\.md$/,
  /^critique-/,
  /^counter-/,
];

export interface ConsolidationResult {
  kept: string[];
  archived: string[];
  spaceSaved: number;
}

export class SortieConsolidator {
  private baseDir: string;
  private copIndex: CopIndex;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    this.copIndex = new CopIndex(baseDir);
  }

  private sortieDir(ticketId: string): string {
    return join(this.baseDir, ticketId);
  }

  private isSynthesis(filename: string): boolean {
    return SYNTHESIS_PATTERN.test(filename);
  }

  private isIntermediate(filename: string): boolean {
    return INTERMEDIATE_PATTERNS.some(p => p.test(filename));
  }

  async consolidate(ticketId: string): Promise<ConsolidationResult> {
    const dir = this.sortieDir(ticketId);
    if (!existsSync(dir)) {
      throw new Error(`Sortie directory not found: ${dir}`);
    }

    const rawDir = join(dir, RAW_DIR);
    await mkdir(rawDir, { recursive: true });

    const entries = await readdir(dir);
    const mdFiles = entries.filter(e => e.endsWith('.md') && e !== 'COP.md');

    const kept: string[] = [];
    const archived: string[] = [];
    let spaceSaved = 0;

    for (const file of mdFiles) {
      if (this.isSynthesis(file)) {
        kept.push(file);
        continue;
      }

      if (this.isIntermediate(file)) {
        const srcPath = join(dir, file);
        const destPath = join(rawDir, file);
        const fileStat = await stat(srcPath);
        spaceSaved += fileStat.size;

        await rename(srcPath, destPath);
        archived.push(file);

        // Update COP index to show _raw/ prefix
        await this.copIndex.addArtifact(
          ticketId,
          `${RAW_DIR}/${file}`,
          fileStat.size,
          'archived',
        );

        logger.debug(`Archived: ${file} → ${RAW_DIR}/${file}`);
      } else {
        // Non-synthesis, non-intermediate files (e.g., sortie-state.yaml) — keep in place
        kept.push(file);
      }
    }

    logger.info(
      `Consolidation complete: ${kept.length} kept, ${archived.length} archived, ` +
      `${(spaceSaved / 1024).toFixed(1)}KB freed from top-level`,
    );

    return { kept, archived, spaceSaved };
  }

  async isConsolidated(ticketId: string): Promise<boolean> {
    const rawDir = join(this.sortieDir(ticketId), RAW_DIR);
    return existsSync(rawDir);
  }
}
