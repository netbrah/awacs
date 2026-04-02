import { spawn } from 'node:child_process';
import type { ModelConfig } from '../../config/types.js';
import type { AgentHarness, HarnessResult, HarnessRunOpts } from '../types.js';
import { logger } from '../../utils/logger.js';

export class CodexHarness implements AgentHarness {
  readonly name = 'codex';
  private executable: string;
  private extraArgs: string[];
  private defaultTimeout: number;

  constructor(config: ModelConfig) {
    this.executable = config.harnessOpts?.executable ?? 'codex';
    this.extraArgs = config.harnessOpts?.args ?? [];
    this.defaultTimeout = config.harnessOpts?.timeout ?? 300_000;
  }

  async run(opts: HarnessRunOpts): Promise<HarnessResult> {
    const start = Date.now();
    const timeout = opts.timeout ?? this.defaultTimeout;
    const cwd = opts.cwd ?? process.cwd();

    const args = ['--quiet', '--json', '-p', opts.task, ...this.extraArgs];

    logger.debug(`[codex] spawning: ${this.executable} ${args.join(' ')}`);

    return new Promise<HarnessResult>((resolve) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];

      const child = spawn(this.executable, args, {
        cwd,
        env: process.env,
        signal: controller.signal,
      });

      child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
      child.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk));

      child.on('close', (code) => {
        clearTimeout(timer);
        const stdout = Buffer.concat(chunks).toString('utf-8');
        const stderr = Buffer.concat(errChunks).toString('utf-8');
        if (stderr) logger.debug(`[codex] stderr: ${stderr}`);
        const durationMs = Date.now() - start;

        let content = stdout;
        try {
          const parsed = JSON.parse(stdout) as { output?: string; content?: string };
          content = parsed.output ?? parsed.content ?? stdout;
        } catch {
          // not JSON — use raw stdout
        }

        resolve({ content, exitCode: code ?? 0, durationMs });
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        const isTimeout = err.name === 'AbortError';
        logger.warn(`[codex] process error: ${err.message}`);
        resolve({
          content: isTimeout ? '[timeout]' : `[error: ${err.message}]`,
          exitCode: isTimeout ? 124 : 1,
          durationMs: Date.now() - start,
        });
      });
    });
  }
}
