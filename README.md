# AWACS — Adversarial Weighted Analysis with Cross-Synthesis

Multi-model adversarial orchestration for ONTAP code sorties. Named after the airborne command aircraft that coordinates the battlespace.

AWACS dispatches analytical tasks (RCA, test planning) to two different LLM models in parallel, then runs a structured adversarial cross-critique cycle before an arbiter synthesizes the final artifact.

## The AWACS Cycle

```
     ┌──────────────┐     ┌──────────────┐
     │   Blue Model  │     │   Red Model   │
     │  (e.g. Opus)  │     │ (e.g. Codex)  │
     └──────┬───────┘     └──────┬───────┘
            │                     │
     ┌──────▼───────┐     ┌──────▼───────┐
     │  Draft (Blue) │     │  Draft (Red)  │
     └──────┬───────┘     └──────┬───────┘
            │    ┌────────────┐   │
            └───▶│   Cross-   │◀──┘
                 │  Critique  │
            ┌───▶│            │◀──┐
            │    └────────────┘   │
     ┌──────┴───────┐     ┌──────┴───────┐
     │   Counter     │     │   Counter     │
     │   (Blue)      │     │   (Red)       │
     └──────┬───────┘     └──────┬───────┘
            │    ┌────────────┐   │
            └───▶│  Arbiter   │◀──┘
                 │ Synthesis  │
                 └─────┬──────┘
                       │
                 ┌─────▼──────┐
                 │   Final     │
                 │  Artifact   │
                 └─────────────┘
```

1. **Parallel Drafts** — Both models produce independent analysis
2. **Cross-Critique** — Each model critiques the other's draft (adversarial)
3. **Counter-Critique** — Each model responds to the critique it received (accept/rebut/out-of-scope)
4. **Synthesis** — Arbiter merges everything with confidence levels (HIGH/MEDIUM/CONTESTED)

## Kill Chain Phases

```
TASKING → RCA → UTP → IMPLEMENT → FTP → VSIM → BDA → AAR
          ^^^   ^^^               ^^^
        AWACS  AWACS             AWACS    (adversarial)
                      ^^^^^^^^         ^^^  ^^^  ^^^
                       single         single (blue only)
```

| Phase | Mode | Description |
|-------|------|-------------|
| RCA | AWACS | Root Cause Analysis — identify root cause with citations |
| UTP | AWACS | Unit Test Plan — define test coverage from RCA |
| Implement | Single | Code changes (manual in MVP) |
| FTP | AWACS | Functional Test Plan — end-to-end validation plan |
| VSIM | Single | Execute FTP against live VSIM |
| BDA | Single | Battle Damage Assessment — mission summary |
| AAR | Single | After Action Review — lessons learned |

Each phase transition is gated — the synthesis artifact must exist before the next phase starts.

## Quick Start

```bash
# Install
npm install

# Build
npm run build

# Configure (see Configuration below)
mkdir -p ~/.awacs
cp config.example.yaml ~/.awacs/config.yaml
# Edit config.yaml with your model endpoints and API keys

# Run a sortie
npx awacs sortie CONTAP-123456

# Check status
npx awacs status CONTAP-123456

# List artifacts
npx awacs artifacts CONTAP-123456
```

## Configuration

### Config File (~/.awacs/config.yaml)

```yaml
models:
  blue:
    id: claude-opus-4.6
    provider: anthropic
    base_url: ${OPENAI_BASE_URL}
    api_key: ${OPENAI_API_KEY}
  red:
    id: gpt-5.3-codex
    provider: openai
    base_url: ${OPENAI_BASE_URL}
    api_key: ${OPENAI_API_KEY}
  arbiter:
    id: claude-opus-4.6
    provider: anthropic
    base_url: ${OPENAI_BASE_URL}
    api_key: ${OPENAI_API_KEY}

artifacts:
  base_dir: ~/.skills/contaps

phases:
  rca: awacs
  unit_test_plan: awacs
  implement: single
  functional_test_plan: awacs
  vsim: single
  bda: single
  aar: single

critique:
  max_rounds: 1
  require_citations: true
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_BASE_URL` | Base URL for OpenAI-compatible API (e.g., LiteLLM proxy) |
| `OPENAI_API_KEY` | API key for the endpoint |
| `AWACS_BLUE_MODEL` | Override blue model ID |
| `AWACS_RED_MODEL` | Override red model ID |
| `AWACS_ARBITER_MODEL` | Override arbiter model ID |
| `AWACS_ARTIFACTS_DIR` | Override artifact storage directory |
| `AWACS_CONFIG_PATH` | Override config file path |

### LiteLLM Proxy Setup

AWACS works with any OpenAI-compatible endpoint. Point `OPENAI_BASE_URL` at your LiteLLM proxy:

```bash
export OPENAI_BASE_URL=http://localhost:4000/v1
export OPENAI_API_KEY=sk-your-litellm-key
```

All models (Blue, Red, Arbiter) go through the same OpenAI SDK — LiteLLM handles routing to the actual providers.

## Artifact Directory Structure

```
~/.skills/contaps/CONTAP-123456/
├── sortie-state.yaml                    # Persistent sortie state
├── rca-blue-opus46.md                   # Phase 1: Blue RCA draft
├── rca-red-codex53.md                   # Phase 1: Red RCA draft
├── critique-of-blue-by-red-codex53.md   # Phase 1: Red critiques Blue
├── critique-of-red-by-blue-opus46.md    # Phase 1: Blue critiques Red
├── counter-blue-opus46.md               # Phase 1: Blue counter
├── counter-red-codex53.md               # Phase 1: Red counter
├── rca-awacs-synthesis.md               # Phase 1: Merged RCA (THE TRUTH)
├── unit_test_plan-blue-opus46.md        # Phase 2: Blue UTP draft
├── unit_test_plan-red-codex53.md        # Phase 2: Red UTP draft
├── ...                                  # Phase 2: critiques, counters
├── unit_test_plan-awacs-synthesis.md    # Phase 2: Merged UTP (THE PLAN)
└── ...                                  # Subsequent phases
```

## CLI Commands

```bash
# Run full sortie
awacs sortie <ticket-id>

# Run with specific models
awacs sortie <ticket-id> --blue claude-opus-4.6 --red gpt-5.3-codex

# Run single phase only
awacs sortie <ticket-id> --phase rca

# Resume from last completed phase
awacs sortie <ticket-id> --resume

# Single-model mode (skip AWACS adversarial cycle)
awacs sortie <ticket-id> --single

# Debug logging
awacs sortie <ticket-id> --verbose

# Check sortie status
awacs status <ticket-id>

# List artifacts
awacs artifacts <ticket-id>
```

## Architecture

```
src/
├── index.ts                 # CLI entry point (Commander.js)
├── config/
│   ├── types.ts             # AwacsConfig, ModelConfig, PhaseConfig
│   └── loader.ts            # Load from ~/.awacs/config.yaml + env vars
├── artifacts/
│   ├── store.ts             # ArtifactStore — CRUD for sortie artifacts
│   └── types.ts             # ArtifactType enum, metadata
├── dispatch/
│   ├── dispatcher.ts        # AwacsDispatcher — parallel LLM dispatch
│   ├── model-client.ts      # Thin OpenAI SDK wrapper
│   └── types.ts             # DispatchResult, ModelResponse
├── critique/
│   ├── protocol.ts          # CrossCritiqueProtocol — full AWACS cycle
│   ├── prompts.ts           # Critique/counter/synthesis prompt templates
│   └── types.ts             # CritiqueResult, SynthesisResult
├── kill-chain/
│   ├── runner.ts            # KillChainRunner — phase sequencing
│   ├── phases.ts            # Phase definitions (RCA, UTP, etc.)
│   ├── gates.ts             # Gate checks between phases
│   └── types.ts             # PhaseStatus, SortieStatus
├── state/
│   ├── sortie.ts            # SortieState — YAML-backed persistence
│   └── types.ts             # SortieConfig, PhaseState
└── utils/
    ├── yaml.ts              # YAML read/write helpers
    ├── atomic-write.ts      # Atomic file writes (temp→rename)
    └── logger.ts            # Console logger with levels
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in dev mode (tsx)
npm run dev -- sortie CONTAP-123456

# Run tests
npm test

# Watch tests
npm run test:watch
```

## Design Decisions

- **OpenAI SDK only** — All LLM calls use the `openai` npm package, which works with any OpenAI-compatible endpoint (LiteLLM, vLLM, direct APIs). No provider-specific SDKs.
- **No streaming** — MVP awaits full completions. Streaming can be added later.
- **No tool calling** — AWACS is a pure text orchestration layer. Tool calling (search, file access) happens in the harness that AWACS dispatches to.
- **Atomic writes** — All file operations write to a temp file then rename, preventing corrupt state.
- **Implementation is manual** — Phase 3 (implement) prints artifact paths and pauses. The user takes the synthesized RCA + UTP into their implementation tool.
