export interface AgentHarness {
  run(opts: HarnessRunOpts): Promise<HarnessResult>;
}

export interface HarnessRunOpts {
  task: string;
  systemPrompt?: string;
  cwd?: string;
  timeout?: number;
  artifacts?: string[];
}

export interface HarnessResult {
  content: string;
  durationMs: number;
}

export interface HarnessConfig {
  command?: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
}
