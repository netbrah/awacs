import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { atomicWrite } from '../utils/atomic-write.js';
import { logger } from '../utils/logger.js';

const COP_FILENAME = 'COP.md';

interface PhaseRow {
  phase: string;
  status: string;
  synthesis: string;
  keyFindings: string;
}

interface ArtifactEntry {
  filename: string;
  size: string;
  description: string;
}

export class CopIndex {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  private copPath(ticketId: string): string {
    return join(this.baseDir, ticketId, COP_FILENAME);
  }

  private parsePhases(content: string): PhaseRow[] {
    const rows: PhaseRow[] = [];
    const lines = content.split('\n');
    let inTable = false;

    for (const line of lines) {
      if (line.startsWith('| Phase')) {
        inTable = true;
        continue;
      }
      if (inTable && line.startsWith('|---')) {
        continue;
      }
      if (inTable && line.startsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0);
        if (cells.length >= 4) {
          rows.push({
            phase: cells[0],
            status: cells[1],
            synthesis: cells[2],
            keyFindings: cells[3],
          });
        }
      } else if (inTable) {
        inTable = false;
      }
    }

    return rows;
  }

  private parseArtifacts(content: string): ArtifactEntry[] {
    const entries: ArtifactEntry[] = [];
    const lines = content.split('\n');
    let inArtifacts = false;

    for (const line of lines) {
      if (line.startsWith('## Artifacts')) {
        inArtifacts = true;
        continue;
      }
      if (inArtifacts && line.startsWith('## ')) {
        break;
      }
      if (inArtifacts && line.startsWith('- ')) {
        const match = line.match(/^- (.+?) \((.+?)\) — (.+)$/);
        if (match) {
          entries.push({ filename: match[1], size: match[2], description: match[3] });
        } else {
          // Simple entry without size/description
          const simple = line.replace(/^- /, '').trim();
          entries.push({ filename: simple, size: '', description: '' });
        }
      }
    }

    return entries;
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    const kb = bytes / 1024;
    return `${kb.toFixed(1)}KB`;
  }

  private render(ticketId: string, phases: PhaseRow[], artifacts: ArtifactEntry[]): string {
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
    const lines: string[] = [
      `# COP — ${ticketId}`,
      `Updated: ${now}`,
      '',
      '## Phases',
      '| Phase | Status | Synthesis | Key Findings |',
      '|-------|--------|-----------|-------------|',
    ];

    for (const row of phases) {
      lines.push(`| ${row.phase} | ${row.status} | ${row.synthesis} | ${row.keyFindings} |`);
    }

    lines.push('');
    lines.push('## Artifacts');

    for (const entry of artifacts) {
      if (entry.size && entry.description) {
        lines.push(`- ${entry.filename} (${entry.size}) — ${entry.description}`);
      } else {
        lines.push(`- ${entry.filename}`);
      }
    }

    lines.push('');
    return lines.join('\n');
  }

  async update(
    ticketId: string,
    phase: string,
    status: string,
    synthesisFile: string | null,
    keyFindings: string,
  ): Promise<void> {
    let phases: PhaseRow[];
    let artifacts: ArtifactEntry[];

    const filePath = this.copPath(ticketId);

    if (existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8');
      phases = this.parsePhases(content);
      artifacts = this.parseArtifacts(content);
    } else {
      phases = [];
      artifacts = [];
    }

    // Update or add the phase row
    const existing = phases.find(r => r.phase === phase);
    if (existing) {
      existing.status = status;
      existing.synthesis = synthesisFile ?? '—';
      existing.keyFindings = keyFindings;
    } else {
      phases.push({
        phase,
        status,
        synthesis: synthesisFile ?? '—',
        keyFindings,
      });
    }

    const rendered = this.render(ticketId, phases, artifacts);
    await atomicWrite(filePath, rendered);
    logger.debug(`COP index updated for ${ticketId} phase ${phase}`);
  }

  async read(ticketId: string): Promise<string> {
    const filePath = this.copPath(ticketId);
    if (!existsSync(filePath)) {
      return '';
    }
    return readFile(filePath, 'utf-8');
  }

  async addArtifact(
    ticketId: string,
    filename: string,
    sizeBytes: number,
    description: string,
  ): Promise<void> {
    let phases: PhaseRow[];
    let artifacts: ArtifactEntry[];

    const filePath = this.copPath(ticketId);

    if (existsSync(filePath)) {
      const content = await readFile(filePath, 'utf-8');
      phases = this.parsePhases(content);
      artifacts = this.parseArtifacts(content);
    } else {
      phases = [];
      artifacts = [];
    }

    // Update if exists, otherwise add
    const existing = artifacts.find(a => a.filename === filename);
    if (existing) {
      existing.size = this.formatSize(sizeBytes);
      existing.description = description;
    } else {
      artifacts.push({
        filename,
        size: this.formatSize(sizeBytes),
        description,
      });
    }

    const rendered = this.render(ticketId, phases, artifacts);
    await atomicWrite(filePath, rendered);
    logger.debug(`COP artifact added: ${filename}`);
  }
}
