import type { ModelConfig } from '../../config/types.js';
import type { AgentHarness, HarnessResult, HarnessRunOpts } from '../types.js';
import { ModelClient } from '../../dispatch/model-client.js';

export class RawLlmHarness implements AgentHarness {
  readonly name = 'raw-llm';
  private client: ModelClient;

  constructor(config: ModelConfig) {
    this.client = new ModelClient(config);
  }

  async run(opts: HarnessRunOpts): Promise<HarnessResult> {
    const start = Date.now();

    const content = await this.client.chat(
      opts.systemPrompt ?? '',
      opts.task,
    );

    return {
      content,
      exitCode: 0,
      durationMs: Date.now() - start,
    };
  }

  getModelId(): string {
    return this.client.getModelId();
  }
}
