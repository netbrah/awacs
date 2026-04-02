import type { AgentHarness, HarnessRunOpts, HarnessResult } from '../types.js';
import { ModelClient } from '../../dispatch/model-client.js';
import type { ModelConfig } from '../../config/types.js';

export class RawLlmHarness implements AgentHarness {
  private client: ModelClient;

  constructor(config: ModelConfig) {
    this.client = new ModelClient(config);
  }

  async run(opts: HarnessRunOpts): Promise<HarnessResult> {
    const start = Date.now();
    const content = await this.client.chat(opts.systemPrompt ?? '', opts.task);
    return {
      content,
      durationMs: Date.now() - start,
    };
  }
}
