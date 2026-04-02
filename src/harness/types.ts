export interface HarnessRunOpts {
  task: string;
  systemPrompt?: string;
  cwd?: string;
  timeout?: number;
  tools?: string[];
  artifacts?: string[];
}

export interface ToolCallLog {
  tool: string;
  args: Record<string, unknown>;
  result?: string;
  durationMs?: number;
}

export interface HarnessResult {
  content: string;
  toolCalls?: ToolCallLog[];
  exitCode: number;
  durationMs: number;
}

export interface AgentHarness {
  readonly name: string;
  run(opts: HarnessRunOpts): Promise<HarnessResult>;
}

export type HarnessName = 'raw-llm' | 'claude-code' | 'codex' | 'gemini-cli' | 'qwen-code';

export interface HarnessOpts {
  executable?: string;
  cwd?: string;
  timeout?: number;
  args?: string[];
}
