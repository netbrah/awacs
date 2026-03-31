import type { AwacsConfig } from '../config/types.js';
import type { SynthesisResult } from './types.js';
import { AwacsDispatcher } from '../dispatch/dispatcher.js';
import { ArtifactStore } from '../artifacts/store.js';
import { buildCritiquePrompt, buildCounterPrompt, buildSynthesisPrompt } from './prompts.js';
import { logger } from '../utils/logger.js';
import chalk from 'chalk';

export class CrossCritiqueProtocol {
  private dispatcher: AwacsDispatcher;
  private store: ArtifactStore;
  private config: AwacsConfig;

  constructor(config: AwacsConfig) {
    this.config = config;
    this.dispatcher = new AwacsDispatcher(config);
    this.store = new ArtifactStore(config.artifacts.baseDir);
  }

  async runCycle(
    phase: string,
    ticketId: string,
    task: string,
    systemPrompt: string,
  ): Promise<SynthesisResult> {
    const blueShort = this.config.models.blue.shortName;
    const redShort = this.config.models.red.shortName;
    const artifacts: string[] = [];

    // Step 1: Parallel drafts
    logger.info(chalk.bold('Step 1/4: Parallel drafts'));
    const { blue: blueResult, red: redResult } = await this.dispatcher.dispatchParallel(
      systemPrompt,
      task,
    );

    // Write discipline: write artifacts to disk FIRST, then track names
    const blueDraftName = `${phase}-blue-${blueShort}.md`;
    const redDraftName = `${phase}-red-${redShort}.md`;
    await this.store.writeArtifact(ticketId, blueDraftName, blueResult.content);
    await this.store.writeArtifact(ticketId, redDraftName, redResult.content);
    artifacts.push(blueDraftName, redDraftName);

    // Step 2: Cross-critique
    logger.info(chalk.bold('Step 2/4: Cross-critique'));
    const critiqueSystemPrompt = buildCritiquePrompt(phase);
    const [redCritiquesBlue, blueCritiquesRed] = await Promise.all([
      this.dispatcher.dispatchSingle('red', critiqueSystemPrompt, blueResult.content),
      this.dispatcher.dispatchSingle('blue', critiqueSystemPrompt, redResult.content),
    ]);

    const critiqueBlueName = `critique-of-blue-by-red-${redShort}.md`;
    const critiqueRedName = `critique-of-red-by-blue-${blueShort}.md`;
    await this.store.writeArtifact(ticketId, critiqueBlueName, redCritiquesBlue.content);
    await this.store.writeArtifact(ticketId, critiqueRedName, blueCritiquesRed.content);
    artifacts.push(critiqueBlueName, critiqueRedName);

    // Step 3: Counter-critique
    logger.info(chalk.bold('Step 3/4: Counter-critique'));
    const counterSystemPrompt = buildCounterPrompt(phase);
    const [blueCounter, redCounter] = await Promise.all([
      this.dispatcher.dispatchSingle('blue', counterSystemPrompt, redCritiquesBlue.content),
      this.dispatcher.dispatchSingle('red', counterSystemPrompt, blueCritiquesRed.content),
    ]);

    const blueCounterName = `counter-blue-${blueShort}.md`;
    const redCounterName = `counter-red-${redShort}.md`;
    await this.store.writeArtifact(ticketId, blueCounterName, blueCounter.content);
    await this.store.writeArtifact(ticketId, redCounterName, redCounter.content);
    artifacts.push(blueCounterName, redCounterName);

    // Step 4: Synthesis
    logger.info(chalk.bold('Step 4/4: Arbiter synthesis'));
    const synthesisSystemPrompt = buildSynthesisPrompt(phase);
    const allArtifacts = [
      `## Blue Draft\n${blueResult.content}`,
      `## Red Draft\n${redResult.content}`,
      `## Red Critiques Blue\n${redCritiquesBlue.content}`,
      `## Blue Critiques Red\n${blueCritiquesRed.content}`,
      `## Blue Counter\n${blueCounter.content}`,
      `## Red Counter\n${redCounter.content}`,
    ].join('\n\n---\n\n');

    const synthesis = await this.dispatcher.dispatchSingle(
      'arbiter',
      synthesisSystemPrompt,
      allArtifacts,
    );

    // Write discipline: synthesis artifact written to disk before returning
    const synthesisName = `${phase}-awacs-synthesis.md`;
    await this.store.writeArtifact(ticketId, synthesisName, synthesis.content);
    artifacts.push(synthesisName);

    logger.info(chalk.green(`AWACS cycle complete for ${phase}. ${artifacts.length} artifacts produced.`));

    // All artifact writes succeeded — safe to return result
    return {
      synthesis: synthesis.content,
      artifacts,
    };
  }
}
