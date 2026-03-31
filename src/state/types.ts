import type { PhaseName, PhaseStatus } from '../kill-chain/types.js';

export interface SortieConfig {
  ticketId: string;
  createdAt: string;
  models: {
    blue: string;
    red: string;
    arbiter: string;
  };
  phases: Record<PhaseName, PhaseStatus>;
}

export interface PhaseState {
  name: PhaseName;
  status: PhaseStatus;
  startedAt?: string;
  completedAt?: string;
}
