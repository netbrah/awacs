import type { HarnessConfig, HarnessRunOpts } from '../types.js';
import { CliHarnessBase } from './cli-base.js';

export class GeminiCliHarness extends CliHarnessBase {
  constructor(config: HarnessConfig) {
    super(config);
  }

  protected defaultCommand(): string {
    return 'gemini';
  }

  buildArgs(opts: HarnessRunOpts): string[] {
    return ['-p', opts.task];
  }
}
