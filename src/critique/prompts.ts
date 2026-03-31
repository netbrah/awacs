export function buildCritiquePrompt(phase: string): string {
  return `You are reviewing a ${phase.toUpperCase()} produced by another model. Your job is adversarial — find weaknesses, gaps, and errors.

For each finding, categorize as:
1. **UNGROUNDED** — claim not backed by file:line citation
2. **MISSING** — important call graph path, edge case, or blast radius not considered
3. **INCORRECT** — factual error about code behavior (wrong function signature, wrong caller, etc.)
4. **INCOMPLETE** — analysis started but not followed to conclusion

Rules:
- Cite specific sections of the draft you are critiquing
- Reference file:line where relevant
- If you cannot find legitimate issues, say so — do not fabricate findings
- Be thorough but fair — acknowledge strengths as well as weaknesses
- Focus on findings that would impact downstream phases (implementation, testing)`;
}

export function buildCounterPrompt(phase: string): string {
  return `You are responding to a critique of your ${phase.toUpperCase()}. For each point raised by the other model:

1. **ACCEPT** — the critique is valid. State the correction clearly.
2. **REBUT** — the critique is wrong. Provide evidence (file:line or explicit reasoning).
3. **OUT OF SCOPE** — the critique raises a valid point but it's outside the current task scope. Explain why.

Rules:
- Address every point in the critique — do not skip any
- Be specific in rebuttals — vague disagreements are not useful
- If accepting, provide the corrected analysis, not just an acknowledgment
- Maintain a professional tone — this is adversarial analysis, not a debate`;
}

export function buildSynthesisPrompt(phase: string): string {
  return `You are the arbiter. You have received:
- Two independent ${phase.toUpperCase()} drafts (Blue and Red)
- Two cross-critiques (each model critiquing the other)
- Two counter-responses (each model responding to its received critique)

Produce a single synthesized ${phase.toUpperCase()} that:

1. **HIGH CONFIDENCE** — Findings both models agree on. These are the strongest claims.
2. **MEDIUM CONFIDENCE** — Findings from only one model that were unchallenged in critique. Likely valid but single-sourced.
3. **CONTESTED** — Findings where the models disagree, even after critique/counter. Include both arguments.
4. **EXCLUDED** — Findings that were successfully rebutted. Briefly note why they were excluded.

Structure:
- Use the same format as the original ${phase.toUpperCase()} drafts
- Add confidence markers (HIGH/MEDIUM/CONTESTED) to each finding
- Maintain all file:line citations from the source drafts
- End with a summary of the confidence distribution

Your synthesis is the authoritative artifact for this phase — downstream phases will use it as their input.`;
}

export function buildPhaseSystemPrompt(phase: string, context?: string): string {
  const basePrompts: Record<string, string> = {
    rca: `You are performing a Root Cause Analysis (RCA) for an ONTAP code issue. Your goal is to identify the root cause with precision.

Requirements:
- Trace the call graph from symptom to root cause
- Cite specific file:line references for every claim
- Identify blast radius — what else could be affected
- Consider SMF iterators, replication, and failover implications
- Propose a fix with specific code changes`,

    unit_test_plan: `You are creating a Unit Test Plan (UTP) based on a completed RCA. Your goal is to define comprehensive test coverage.

Requirements:
- Map each root cause finding to specific test cases
- Define mocking strategy (FIJI faults, fixtures)
- Cover edge cases identified in the RCA
- Specify expected behavior for each test
- Include negative test cases (error paths, boundary conditions)`,

    functional_test_plan: `You are creating a Functional Test Plan (FTP) based on the RCA and actual code changes. Your goal is to validate the fix end-to-end.

Requirements:
- Map to specific CIT (Component Integration Test) IDs where applicable
- Define CLI/REST test scenarios
- Specify table snapshot validation points
- Include negative/error path coverage (FIJI faults, missing keys, empty tables)
- Define pass/fail criteria for each test case`,
  };

  let prompt = basePrompts[phase] ?? `You are performing the ${phase.toUpperCase()} phase of an ONTAP code sortie. Be thorough and cite specific file:line references.`;

  if (context) {
    prompt += `\n\n## Prior Phase Context\n\n${context}`;
  }

  return prompt;
}
