export type PhaseName =
  | 'rca'
  | 'unit_test_plan'
  | 'implement'
  | 'functional_test_plan'
  | 'vsim'
  | 'bda'
  | 'aar';

export type PhaseStatus =
  | 'pending'
  | 'dispatched'
  | 'critiquing'
  | 'synthesizing'
  | 'complete'
  | 'failed'
  | 'skipped'
  | 'pending_manual';

export interface GateResult {
  passed: boolean;
  reason: string;
}

export interface SortieStatus {
  ticketId: string;
  phases: Record<PhaseName, PhaseStatus>;
  currentPhase: PhaseName | null;
}
