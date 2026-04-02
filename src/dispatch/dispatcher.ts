import type { AwacsConfig } from '../config/types.js';
import type { DispatchResult, ModelResponse } from './types.js';
import { createHarness } from '../harness/registry.js';
import type { AgentHarness } from '../harness/types.js';
import { logger } from '../utils/logger.js';

export type ModelRole = 'blue' | 'red' | 'arbiter';

export class AwacsDispatcher {
  private harnesses: Record<ModelRole, AgentHarness>;
  private modelIds: Record<ModelRole, string>;

  constructor(config: AwacsConfig) {
    this.modelIds = {
      blue: config.models.blue.id,
      red: config.models.red.id,
      arbiter: config.models.arbiter.id,
    };
    this.harnesses = {
      blue: createHarness(config.models.blue.harness ?? 'raw-llm', config.models.blue),
      red: createHarness(config.models.red.harness ?? 'raw-llm', config.models.red),
      arbiter: createHarness(config.models.arbiter.harness ?? 'raw-llm', config.models.arbiter),
    };
  }

  async dispatchParallel(
    systemPrompt: string,
    userMessage: string,
  ): Promise<DispatchResult> {
    logger.info('Dispatching to Blue and Red in parallel...');

    const [blueResult, redResult] = await Promise.all([
      this.harnesses.blue.run({ task: userMessage, systemPrompt }),
      this.harnesses.red.run({ task: userMessage, systemPrompt }),
    ]);

    logger.info(`Blue responded in ${blueResult.durationMs}ms, Red in ${redResult.durationMs}ms`);

    return {
      blue: {
        content: blueResult.content,
        model: this.modelIds.blue,
        role: 'blue',
        durationMs: blueResult.durationMs,
      },
      red: {
        content: redResult.content,
        model: this.modelIds.red,
        role: 'red',
        durationMs: redResult.durationMs,
      },
    };
  }

  async dispatchSingle(
    role: ModelRole,
    systemPrompt: string,
    userMessage: string,
  ): Promise<ModelResponse> {
    logger.info(`Dispatching to ${role}...`);

    const result = await this.harnesses[role].run({ task: userMessage, systemPrompt });

    logger.info(`${role} responded in ${result.durationMs}ms`);

    return {
      content: result.content,
      model: this.modelIds[role],
      role: role === 'arbiter' ? 'arbiter' : role,
      durationMs: result.durationMs,
    };
  }
}
