import type { HarnessConfig, HarnessRunOpts } from '../types.js';
import { CliHarnessBase, extractJsonlContent } from './cli-base.js';

export class QwenCodeHarness extends CliHarnessBase {
  constructor(config: HarnessConfig) {
    super(config);
  }

  protected defaultCommand(): string {
    return 'qwen-code';
  }

  buildArgs(opts: HarnessRunOpts): string[] {
    return ['-p', opts.task, '--json'];
  }

  protected parseOutput(raw: string): string {
    return extractJsonlContent(raw);
  }
}
