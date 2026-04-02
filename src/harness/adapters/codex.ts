import type { HarnessConfig, HarnessRunOpts } from '../types.js';
import { CliHarnessBase } from './cli-base.js';

export class CodexHarness extends CliHarnessBase {
  constructor(config: HarnessConfig) {
    super(config);
  }

  protected defaultCommand(): string {
    return 'codex';
  }

  buildArgs(opts: HarnessRunOpts): string[] {
    return ['--quiet', '--json', '-p', opts.task];
  }
}
