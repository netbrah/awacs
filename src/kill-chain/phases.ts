import type { PhaseName } from './types.js';
import type { PhaseMode } from '../config/types.js';

export interface PhaseDefinition {
  name: PhaseName;
  label: string;
  description: string;
  defaultMode: PhaseMode;
  dependsOn: PhaseName[];
  synthesisArtifact: string;
}

export const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    name: 'rca',
    label: 'Root Cause Analysis',
    description: 'Identify root cause with file:line citations and blast radius',
    defaultMode: 'awacs',
    dependsOn: [],
    synthesisArtifact: 'rca-awacs-synthesis.md',
  },
  {
    name: 'unit_test_plan',
    label: 'Unit Test Plan',
    description: 'Define unit test coverage based on RCA findings',
    defaultMode: 'awacs',
    dependsOn: ['rca'],
    synthesisArtifact: 'unit_test_plan-awacs-synthesis.md',
  },
  {
    name: 'implement',
    label: 'Implementation',
    description: 'Implement fix guided by RCA + UTP artifacts',
    defaultMode: 'single',
    dependsOn: ['rca', 'unit_test_plan'],
    synthesisArtifact: '',
  },
  {
    name: 'functional_test_plan',
    label: 'Functional Test Plan',
    description: 'Define functional test coverage based on RCA + implementation diff',
    defaultMode: 'awacs',
    dependsOn: ['rca', 'implement'],
    synthesisArtifact: 'functional_test_plan-awacs-synthesis.md',
  },
  {
    name: 'vsim',
    label: 'VSIM Validation',
    description: 'Execute functional test plan against live VSIM',
    defaultMode: 'single',
    dependsOn: ['functional_test_plan'],
    synthesisArtifact: '',
  },
  {
    name: 'bda',
    label: 'Battle Damage Assessment',
    description: 'Summarize mission results and outcomes',
    defaultMode: 'single',
    dependsOn: ['vsim'],
    synthesisArtifact: '',
  },
  {
    name: 'aar',
    label: 'After Action Review',
    description: 'Capture lessons learned and process improvements',
    defaultMode: 'single',
    dependsOn: ['bda'],
    synthesisArtifact: '',
  },
];

export function getPhaseDefinition(name: PhaseName): PhaseDefinition {
  const def = PHASE_DEFINITIONS.find(p => p.name === name);
  if (!def) {
    throw new Error(`Unknown phase: ${name}`);
  }
  return def;
}
