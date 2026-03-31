export interface ModelResponse {
  content: string;
  model: string;
  role: 'blue' | 'red' | 'arbiter';
  durationMs: number;
}

export interface DispatchResult {
  blue: ModelResponse;
  red: ModelResponse;
}
