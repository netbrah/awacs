import type { AwacsConfig } from '../config/types.js';
import type { DispatchResult, ModelResponse } from './types.js';
import { ModelClient } from './model-client.js';
import { logger } from '../utils/logger.js';

export type ModelRole = 'blue' | 'red' | 'arbiter';

export class AwacsDispatcher {
  private clients: Record<ModelRole, ModelClient>;

  constructor(config: AwacsConfig) {
    this.clients = {
      blue: new ModelClient(config.models.blue),
      red: new ModelClient(config.models.red),
      arbiter: new ModelClient(config.models.arbiter),
    };
  }

  async dispatchParallel(
    systemPrompt: string,
    userMessage: string,
  ): Promise<DispatchResult> {
    logger.info('Dispatching to Blue and Red in parallel...');
    const start = Date.now();

    const [blueContent, redContent] = await Promise.all([
      this.clients.blue.chat(systemPrompt, userMessage),
      this.clients.red.chat(systemPrompt, userMessage),
    ]);

    const elapsed = Date.now() - start;
    logger.info(`Both models responded in ${elapsed}ms`);

    return {
      blue: {
        content: blueContent,
        model: this.clients.blue.getModelId(),
        role: 'blue',
        durationMs: elapsed,
      },
      red: {
        content: redContent,
        model: this.clients.red.getModelId(),
        role: 'red',
        durationMs: elapsed,
      },
    };
  }

  async dispatchSingle(
    role: ModelRole,
    systemPrompt: string,
    userMessage: string,
  ): Promise<ModelResponse> {
    logger.info(`Dispatching to ${role}...`);
    const start = Date.now();

    const content = await this.clients[role].chat(systemPrompt, userMessage);
    const elapsed = Date.now() - start;

    return {
      content,
      model: this.clients[role].getModelId(),
      role: role === 'arbiter' ? 'arbiter' : role,
      durationMs: elapsed,
    };
  }
}
