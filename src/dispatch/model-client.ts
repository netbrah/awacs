import OpenAI from 'openai';
import type { ModelConfig } from '../config/types.js';
import { logger } from '../utils/logger.js';

export class ModelClient {
  private client: OpenAI;
  private modelId: string;
  private label: string;

  constructor(config: ModelConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.modelId = config.id;
    this.label = `${config.shortName} (${config.provider})`;
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string> {
    logger.debug(`Dispatching to ${this.label}: ${this.modelId}`);
    const start = Date.now();

    const response = await this.client.chat.completions.create({
      model: this.modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 16384,
    });

    const content = response.choices[0]?.message?.content ?? '';
    const elapsed = Date.now() - start;
    logger.info(`${this.label} responded in ${elapsed}ms (${content.length} chars)`);

    return content;
  }

  getModelId(): string {
    return this.modelId;
  }

  getLabel(): string {
    return this.label;
  }
}
