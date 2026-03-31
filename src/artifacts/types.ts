export enum ArtifactType {
  Draft = 'draft',
  Critique = 'critique',
  Counter = 'counter',
  Synthesis = 'synthesis',
  State = 'state',
}

export interface ArtifactMetadata {
  name: string;
  phase: string;
  type: ArtifactType;
  model?: string;
  ticketId: string;
  createdAt: Date;
}
