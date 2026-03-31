import type { GateResult, PhaseName } from './types.js';
import { ArtifactStore } from '../artifacts/store.js';
import { getPhaseDefinition } from './phases.js';
import { logger } from '../utils/logger.js';

export class GateChecker {
  private store: ArtifactStore;

  constructor(store: ArtifactStore) {
    this.store = store;
  }

  async checkSynthesisExists(ticketId: string, phase: PhaseName): Promise<GateResult> {
    const def = getPhaseDefinition(phase);
    if (!def.synthesisArtifact) {
      return { passed: true, reason: `Phase ${phase} does not require a synthesis artifact` };
    }

    const exists = await this.store.artifactExists(ticketId, def.synthesisArtifact);
    if (exists) {
      logger.info(`Gate passed: ${def.synthesisArtifact} exists`);
      return { passed: true, reason: `${def.synthesisArtifact} exists` };
    }

    logger.warn(`Gate failed: ${def.synthesisArtifact} not found`);
    return { passed: false, reason: `${def.synthesisArtifact} not found — cannot proceed` };
  }

  async checkDependencies(ticketId: string, phase: PhaseName): Promise<GateResult> {
    const def = getPhaseDefinition(phase);
    const missing: string[] = [];

    for (const dep of def.dependsOn) {
      const depDef = getPhaseDefinition(dep);
      if (depDef.synthesisArtifact) {
        const exists = await this.store.artifactExists(ticketId, depDef.synthesisArtifact);
        if (!exists) {
          missing.push(`${dep} (${depDef.synthesisArtifact})`);
        }
      }
    }

    if (missing.length === 0) {
      return { passed: true, reason: 'All dependencies satisfied' };
    }

    return {
      passed: false,
      reason: `Missing dependency artifacts: ${missing.join(', ')}`,
    };
  }
}
