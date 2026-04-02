import { spawn } from 'node:child_process';
import type { AgentHarness, HarnessConfig, HarnessRunOpts, HarnessResult } from '../types.js';
import { logger } from '../../utils/logger.js';

export abstract class CliHarnessBase implements AgentHarness {
  protected config: HarnessConfig;

  constructor(config: HarnessConfig) {
    this.config = config;
  }

  abstract buildArgs(opts: HarnessRunOpts): string[];
  protected abstract defaultCommand(): string;

  async run(opts: HarnessRunOpts): Promise<HarnessResult> {
    const start = Date.now();
    const command = this.config.command ?? this.defaultCommand();
    const args = [...this.buildArgs(opts), ...(this.config.args ?? [])];
    const cwd = opts.cwd ?? this.config.cwd;
    const timeoutMs = (opts.timeout ?? this.config.timeout ?? 300) * 1000;

    const raw = await this.spawnAndCollect(command, args, cwd, timeoutMs);
    return {
      content: this.parseOutput(raw),
      durationMs: Date.now() - start,
    };
  }

  protected parseOutput(raw: string): string {
    return raw;
  }

  protected spawnAndCollect(
    command: string,
    args: string[],
    cwd: string | undefined,
    timeoutMs: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error(`Process timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('close', (code: number | null) => {
        clearTimeout(timer);
        if (stderr) {
          logger.debug(`[harness stderr] ${stderr}`);
        }
        if (code !== 0 && code !== null) {
          reject(new Error(`Process exited with code ${code}: ${stderr}`));
          return;
        }
        resolve(stdout);
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }
}

/**
 * Attempt to extract the final answer from a JSONL agent output stream.
 * Looks for a `{"type":"result","result":"..."}` line, then falls back to
 * the last assistant message content, then returns the raw string.
 */
export function extractJsonlContent(raw: string): string {
  const lines = raw.trim().split('\n');

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;

      if (parsed['type'] === 'result' && typeof parsed['result'] === 'string') {
        return parsed['result'];
      }

      if (parsed['type'] === 'assistant') {
        const msg = parsed['message'] as Record<string, unknown> | undefined;
        const content = msg?.['content'] as Array<{ type: string; text?: string }> | undefined;
        if (Array.isArray(content)) {
          const textBlock = content.find(c => c.type === 'text');
          if (textBlock?.text) return textBlock.text;
        }
      }
    } catch {
      // Not JSON; keep scanning
    }
  }

  return raw;
}
