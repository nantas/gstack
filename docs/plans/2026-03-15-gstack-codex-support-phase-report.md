# gstack Codex Support Phase Report (2026-03-15)

## Scope

- Plan source: `docs/plans/2026-03-15-gstack-codex-support-design.md`
- Execution mode: serial phase gates (Phase 0 -> 6)
- Default provider policy: `claude` default, `codex` opt-in

## Phase 0 - Prep and Safety

- Gate: **PASS**
- Delivered:
  - `GSTACK_AGENT_PROVIDER` config + resolver (`test/helpers/provider-config.ts`)
  - runner factory entrypoint (`test/helpers/runner-factory.ts`)
  - smoke baseline tests (`test/skill-smoke.provider.test.ts`)
- Evidence:
  - `bun test test/helpers/provider-config.test.ts test/helpers/runner-factory.test.ts test/skill-smoke.provider.test.ts`

## Phase 1 - Runner Abstraction

- Gate: **PASS**
- Delivered:
  - normalized runner types (`test/helpers/runner-types.ts`)
  - Claude adapter extracted (`test/helpers/claude-runner.ts`)
  - backward-compat shim (`test/helpers/session-runner.ts`)
  - E2E suite routed through factory (`test/skill-e2e.test.ts`)
- Evidence:
  - `bun test test/helpers/runner-types.test.ts test/helpers/session-runner.test.ts test/helpers/claude-runner.test.ts test/helpers/observability.test.ts`

## Phase 2 - Codex JSONL Adaptation

- Gate: **PASS**
- Delivered:
  - Codex JSONL parser with failure precedence (`test/helpers/codex-jsonl-parser.ts`)
  - Codex runner adapter (`test/helpers/codex-runner.ts`)
  - minimal Codex non-interactive E2E smoke (`test/skill-e2e-codex.test.ts`)
- Evidence:
  - `bun test test/helpers/codex-jsonl-parser.test.ts test/helpers/codex-runner.test.ts test/skill-e2e-codex.test.ts`

## Phase 3 - Providerized Skill Templates

- Gate: **PASS**
- Delivered:
  - provider-aware setup/update snippets in generator (`scripts/gen-skill-docs.ts`)
  - high-impact templates updated (`review/SKILL.md.tmpl`, `ship/SKILL.md.tmpl`)
  - generated skills refreshed (`SKILL.md`, `review/SKILL.md`, `ship/SKILL.md`, `qa/SKILL.md`, etc.)
  - generator/validation assertions extended
- Evidence:
  - `bun run gen:skill-docs`
  - `bun test test/gen-skill-docs.test.ts test/skill-validation.test.ts`

## Phase 4 - Setup and Path Lifecycle

- Gate: **PASS**
- Delivered:
  - setup supports both `.claude/skills` and `.codex/skills` roots (`setup`)
  - path lifecycle test coverage (`test/setup-paths.test.ts`)
  - docs updated for dual skill roots (`README.md`, `BROWSER.md`, `AGENTS.md`, `CONTRIBUTING.md`, `ARCHITECTURE.md`)
- Evidence:
  - `bun test test/setup-paths.test.ts`

## Phase 5 - Evaluation Layer Decoupling

- Gate: **PASS**
- Delivered:
  - judge provider abstraction (`test/helpers/llm-judge.ts`)
  - judge provider tests (`test/helpers/llm-judge-provider.test.ts`)
  - codex scripts added (`package.json`: `test:e2e:codex`, `test:evals:codex`)
  - eval schema compatibility with provider field (`test/helpers/eval-store.ts`)
- Evidence:
  - `bun test test/helpers/llm-judge-provider.test.ts test/helpers/eval-store.test.ts test/helpers/script-routing.test.ts`

## Phase 6 - Release and Rollback

- Gate: **PASS**
- Delivered:
  - 2-pass switch gate logic (`test/helpers/release-gate.ts`)
  - default/rollback tests (`test/provider-default-switch.test.ts`, `test/provider-rollback.test.ts`, `test/release-gate.test.ts`)
  - default remains `claude` unless explicit provider override
- Evidence:
  - `bun test test/release-gate.test.ts test/provider-default-switch.test.ts test/provider-rollback.test.ts`
  - `bun run test:e2e:codex && bun run test:e2e:codex` (2 consecutive PASS)

## Global Verification

- `bun test` -> PASS
- `bun run gen:skill-docs --dry-run` -> all `FRESH`

## Rollback

- Immediate rollback command:
  - `GSTACK_AGENT_PROVIDER=claude bun run test:e2e`
- Operational rollback policy:
  - keep default at `claude`
  - enable `codex` only by explicit env flag until rollout criteria are met
