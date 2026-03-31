import type { AwacsConfig } from '../config/types.js';
import type { PhaseName } from './types.js';
import { PHASE_DEFINITIONS, getPhaseDefinition } from './phases.js';
import { GateChecker } from './gates.js';
import { CrossCritiqueProtocol } from '../critique/protocol.js';
import { ArtifactStore } from '../artifacts/store.js';
import { SortieState } from '../state/sortie.js';
import { buildPhaseSystemPrompt } from '../critique/prompts.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export interface RunnerOptions {
  phase?: PhaseName;
  resume?: boolean;
  single?: boolean;
}

export class KillChainRunner {
  private config: AwacsConfig;
  private store: ArtifactStore;
  private gates: GateChecker;
  private critique: CrossCritiqueProtocol;

  constructor(config: AwacsConfig) {
    this.config = config;
    this.store = new ArtifactStore(config.artifacts.baseDir);
    this.gates = new GateChecker(this.store);
    this.critique = new CrossCritiqueProtocol(config);
  }

  async runSortie(ticketId: string, taskDescription: string, opts?: RunnerOptions): Promise<void> {
    // Initialize sortie directory and state
    await this.store.ensureSortieDir(ticketId);
    const state = new SortieState(ticketId, this.config.artifacts.baseDir);
    await state.initialize({
      blue: this.config.models.blue.id,
      red: this.config.models.red.id,
      arbiter: this.config.models.arbiter.id,
    });

    console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║          AWACS SORTIE INITIATED          ║'));
    console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'));
    console.log(chalk.white(`  Ticket:  ${chalk.bold(ticketId)}`));
    console.log(chalk.white(`  Blue:    ${chalk.blue(this.config.models.blue.id)}`));
    console.log(chalk.white(`  Red:     ${chalk.red(this.config.models.red.id)}`));
    console.log(chalk.white(`  Arbiter: ${chalk.magenta(this.config.models.arbiter.id)}`));
    console.log(chalk.white(`  Dir:     ${this.store.getSortieDir(ticketId)}\n`));

    // Determine which phases to run
    const phases = this.getPhasesToRun(state, opts);

    for (const phaseDef of phases) {
      // Check dependencies
      const depGate = await this.gates.checkDependencies(ticketId, phaseDef.name);
      if (!depGate.passed) {
        logger.warn(`Skipping ${phaseDef.name}: ${depGate.reason}`);
        await state.updatePhase(phaseDef.name, 'skipped');
        continue;
      }

      const mode = opts?.single ? 'single' : this.config.phases[phaseDef.name];

      console.log(chalk.bold(`\n${'─'.repeat(50)}`));
      console.log(chalk.bold(`Phase: ${phaseDef.label} (${mode.toUpperCase()} mode)`));
      console.log(`${'─'.repeat(50)}`);

      if (mode === 'awacs') {
        await this.runAwacsPhase(phaseDef.name, ticketId, taskDescription, state);
      } else {
        await this.runSinglePhase(phaseDef.name, ticketId, taskDescription, state);
      }
    }

    if (state.isComplete()) {
      console.log(chalk.bold.green('\n✓ Sortie complete.'));
    } else {
      console.log(chalk.yellow('\nSortie paused. Resume with --resume.'));
    }

    console.log(chalk.dim(`Artifacts: ${this.store.getSortieDir(ticketId)}\n`));
  }

  private getPhasesToRun(state: SortieState, opts?: RunnerOptions): typeof PHASE_DEFINITIONS {
    if (opts?.phase) {
      const def = getPhaseDefinition(opts.phase);
      return [def];
    }

    if (opts?.resume) {
      const nextPhase = state.getNextPendingPhase();
      if (!nextPhase) {
        logger.info('All phases complete or skipped');
        return [];
      }
      const idx = PHASE_DEFINITIONS.findIndex(p => p.name === nextPhase);
      return PHASE_DEFINITIONS.slice(idx);
    }

    return [...PHASE_DEFINITIONS];
  }

  private async runAwacsPhase(
    phase: PhaseName,
    ticketId: string,
    task: string,
    state: SortieState,
  ): Promise<void> {
    // Gather context from prior phases
    const context = await this.gatherPriorContext(ticketId, phase);
    const systemPrompt = buildPhaseSystemPrompt(phase, context);

    await state.updatePhase(phase, 'dispatched');
    try {
      const result = await this.critique.runCycle(phase, ticketId, task, systemPrompt);

      await state.updatePhase(phase, 'synthesizing');

      // Gate check
      const gate = await this.gates.checkSynthesisExists(ticketId, phase);
      if (!gate.passed) {
        await state.updatePhase(phase, 'failed');
        throw new Error(`Gate failed for ${phase}: ${gate.reason}`);
      }

      await state.updatePhase(phase, 'complete');
      console.log(chalk.green(`  ✓ ${phase} complete — ${result.artifacts.length} artifacts`));
    } catch (err) {
      await state.updatePhase(phase, 'failed');
      throw err;
    }
  }

  private async runSinglePhase(
    phase: PhaseName,
    ticketId: string,
    task: string,
    state: SortieState,
  ): Promise<void> {
    if (phase === 'implement') {
      // Implementation is manual in MVP
      console.log(chalk.yellow('  Implementation is manual in MVP.'));
      console.log(chalk.yellow('  Use the synthesized RCA + UTP artifacts in your implementation tool.'));
      console.log(chalk.dim(`  Artifacts: ${this.store.getSortieDir(ticketId)}/`));
      await state.updatePhase(phase, 'pending_manual');
      return;
    }

    // For other single-model phases, dispatch to blue only
    const context = await this.gatherPriorContext(ticketId, phase);
    const systemPrompt = buildPhaseSystemPrompt(phase, context);

    await state.updatePhase(phase, 'dispatched');
    try {
      const { AwacsDispatcher } = await import('../dispatch/dispatcher.js');
      const dispatcher = new AwacsDispatcher(this.config);
      const result = await dispatcher.dispatchSingle('blue', systemPrompt, task);

      const blueShort = this.config.models.blue.shortName;
      await this.store.writeArtifact(ticketId, `${phase}-blue-${blueShort}.md`, result.content);
      await state.updatePhase(phase, 'complete');
      console.log(chalk.green(`  ✓ ${phase} complete (single model)`));
    } catch (err) {
      await state.updatePhase(phase, 'failed');
      throw err;
    }
  }

  private async gatherPriorContext(ticketId: string, currentPhase: PhaseName): Promise<string | undefined> {
    const phaseDef = getPhaseDefinition(currentPhase);
    const contextParts: string[] = [];

    for (const dep of phaseDef.dependsOn) {
      const depDef = getPhaseDefinition(dep);
      if (depDef.synthesisArtifact) {
        const content = await this.store.readArtifact(ticketId, depDef.synthesisArtifact);
        if (content) {
          contextParts.push(`### ${depDef.label} Synthesis\n\n${content}`);
        }
      }
    }

    return contextParts.length > 0 ? contextParts.join('\n\n') : undefined;
  }
}
