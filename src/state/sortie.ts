import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { PhaseName, PhaseStatus } from '../kill-chain/types.js';
import type { SortieConfig } from './types.js';
import type { ArtifactStore } from '../artifacts/store.js';
import { readYaml, writeYaml } from '../utils/yaml.js';
import { getPhaseDefinition } from '../kill-chain/phases.js';
import { logger } from '../utils/logger.js';

const STATE_FILENAME = 'sortie-state.yaml';

const ALL_PHASES: PhaseName[] = [
  'rca',
  'unit_test_plan',
  'implement',
  'functional_test_plan',
  'vsim',
  'bda',
  'aar',
];

export class SortieState {
  private ticketId: string;
  private baseDir: string;
  private state: SortieConfig;

  constructor(ticketId: string, baseDir: string) {
    this.ticketId = ticketId;
    this.baseDir = baseDir;
    this.state = {
      ticketId,
      createdAt: new Date().toISOString(),
      models: { blue: '', red: '', arbiter: '' },
      phases: {
        rca: 'pending',
        unit_test_plan: 'pending',
        implement: 'pending',
        functional_test_plan: 'pending',
        vsim: 'pending',
        bda: 'pending',
        aar: 'pending',
      },
    };
  }

  private get statePath(): string {
    return join(this.baseDir, this.ticketId, STATE_FILENAME);
  }

  async initialize(models: { blue: string; red: string; arbiter: string }): Promise<void> {
    if (existsSync(this.statePath)) {
      logger.info('Loading existing sortie state...');
      await this.load();
      return;
    }

    this.state.models = models;
    this.state.createdAt = new Date().toISOString();
    await this.save();
    logger.info(`Initialized sortie state for ${this.ticketId}`);
  }

  async load(): Promise<void> {
    this.state = await readYaml<SortieConfig>(this.statePath);
    this.ticketId = this.state.ticketId;
  }

  async save(): Promise<void> {
    await writeYaml(this.statePath, this.state);
  }

  async updatePhase(phase: PhaseName, status: PhaseStatus): Promise<void> {
    this.state.phases[phase] = status;
    await this.save();
    logger.debug(`Phase ${phase} → ${status}`);
  }

  getPhase(phase: PhaseName): PhaseStatus {
    return this.state.phases[phase];
  }

  getState(): SortieConfig {
    return { ...this.state };
  }

  getLastCompletedPhase(): PhaseName | null {
    for (let i = ALL_PHASES.length - 1; i >= 0; i--) {
      if (this.state.phases[ALL_PHASES[i]] === 'complete') {
        return ALL_PHASES[i];
      }
    }
    return null;
  }

  getNextPendingPhase(): PhaseName | null {
    for (const phase of ALL_PHASES) {
      if (this.state.phases[phase] === 'pending') {
        return phase;
      }
    }
    return null;
  }

  isComplete(): boolean {
    return ALL_PHASES.every(p => this.state.phases[p] === 'complete' || this.state.phases[p] === 'skipped');
  }

  async verify(store: ArtifactStore): Promise<PhaseName[]> {
    const downgraded: PhaseName[] = [];

    for (const phase of ALL_PHASES) {
      if (this.state.phases[phase] !== 'complete') {
        continue;
      }

      const def = getPhaseDefinition(phase);
      if (!def.synthesisArtifact) {
        // Phase has no required synthesis artifact — skip verification
        continue;
      }

      const exists = await store.artifactExists(this.ticketId, def.synthesisArtifact);
      if (!exists) {
        logger.warn(`Verify: ${phase} marked complete but ${def.synthesisArtifact} missing — downgrading to failed`);
        this.state.phases[phase] = 'failed';
        downgraded.push(phase);
      }
    }

    if (downgraded.length > 0) {
      await this.save();
    }

    return downgraded;
  }
}
