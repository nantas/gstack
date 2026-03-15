# gstack Codex Support Dual-Track Design

- Date: 2026-03-15
- Status: Implemented (Phase 0-6 complete)
- Scope: Execute all phases in `docs/plans/2026-03-15-gstack-codex-support-handoff.md`
- Decision: Serial phase gates (Phase 0 -> 6), no cross-phase implementation

## 1. Execution Gates (Approved)

- Fixed order: `Phase 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6`
- Each phase must pass both:
  - A documented checklist (auditable)
  - Concrete test cases (implemented by agent)
- Next phase is blocked until current phase checklist + tests are green.
- Failed phase must be fixed in-phase before proceeding.
- Default-provider switch gate: Codex E2E must pass `2` consecutive runs.

## 2. Phase Acceptance Checklists (Approved)

### Phase 0 - Prep and Safety

- [x] Add `GSTACK_AGENT_PROVIDER=claude|codex` (default `claude`)
- [x] Preserve exact existing behavior on `claude` path
- [x] Define smoke baseline for `/review` and `/qa quick`
- [x] Document provider switch and rollback instructions

### Phase 1 - Runner Abstraction

- [x] Define unified `AgentRunner` interface + normalized result model
- [x] Split `test/helpers/session-runner.ts` into:
  - [x] `test/helpers/claude-runner.ts`
  - [x] `test/helpers/codex-runner.ts`
  - [x] `test/helpers/runner-types.ts`
- [x] Make `test/skill-e2e.test.ts` call runner interface (not hardcoded provider)
- [x] Keep Claude E2E semantics/output compatibility

### Phase 2 - Codex JSONL Adaptation

- [x] Implement `codex exec --json --ephemeral` execution path
- [x] Parse Codex JSONL events into normalized fields:
  - [x] `toolCalls`
  - [x] `exitReason`
  - [x] `transcript`
  - [x] `duration`
  - [x] `output`
- [x] Define priority rules for `turn.failed` / `error` vs process exit code
- [x] Pass at least one minimal non-interactive Codex E2E scenario

### Phase 3 - Providerized Skill Templates

- [x] Introduce provider-aware placeholders in template generation
- [x] Replace hardcoded `AskUserQuestion` with semantic placeholders
- [x] Replace hardcoded `.claude/skills/...` paths with provider-aware paths
- [x] Complete first pass on high-impact templates:
  - [x] `review/SKILL.md.tmpl`
  - [x] `ship/SKILL.md.tmpl`
  - [x] `qa/SKILL.md.tmpl`

### Phase 4 - Setup and Path Lifecycle

- [x] Extend `setup` to support `.codex/skills` while preserving `.claude/skills`
- [x] Remove single-path assumptions from setup/update checks
- [x] Update installation and troubleshooting docs for Codex
- [x] Validate both global and project-vendored install shapes

### Phase 5 - Evaluation Layer Decoupling

- [x] Decouple LLM judge provider abstraction from Anthropic default binding
- [x] Add executable Codex E2E script (`test:e2e:codex`)
- [x] Define provider strategy for eval scripts (`test:evals` family)
- [x] Keep Claude eval path as fallback for regression/rollback

### Phase 6 - Release and Rollback

- [x] Keep default provider as `claude` during gray rollout
- [x] Allow default switch only after Codex E2E passes `2` consecutive runs
- [x] Keep single-env fast rollback to `claude`
- [x] Document release criteria, failure signals, and rollback playbook

## 3. Agent Test Case Backlog (Approved)

### Phase 0 tests

- `test/helpers/provider-config.test.ts`
  - default provider resolution
  - invalid value fallback
  - env override precedence
- `test/helpers/runner-factory.test.ts`
  - provider -> runner mapping
  - claude fallback behavior
- `test/skill-smoke.provider.test.ts`
  - `/review` smoke on Claude provider
  - `/qa quick` smoke on Claude provider

### Phase 1 tests

- `test/helpers/runner-types.test.ts`
  - normalized result schema contract
- `test/helpers/claude-runner.test.ts`
  - parity with legacy transcript/tool parsing behavior
- `test/skill-e2e.test.ts` (refactor assertions)
  - confirms runner invoked through factory/interface

### Phase 2 tests

- `test/helpers/codex-jsonl-parser.test.ts`
  - normal event stream parsing
  - `turn.failed` precedence
  - `error` vs exit code precedence
  - malformed JSONL tolerance
- `test/helpers/codex-runner.test.ts`
  - command argument assembly
  - normalized result mapping
- `test/skill-e2e-codex.test.ts`
  - at least one non-interactive end-to-end Codex flow

### Phase 3 tests

- `test/gen-skill-docs.test.ts` (extended)
  - provider placeholder expansion correctness
  - automation-track templates avoid blocking question flow
  - generated docs for `review/ship/qa` are providerized
- `test/skill-validation.test.ts` (extended)
  - no hardcoded `.claude/skills` assumptions in target sections
  - `AskUserQuestion` usage constrained to interactive contexts

### Phase 4 tests

- `test/setup-paths.test.ts` (new integration tests)
  - setup works under `.claude/skills`
  - setup works under `.codex/skills`
  - graceful no-link mode outside skills directory
- E2E setup-discovery branch checks
  - codex path branch in setup block is discoverable and non-crashing

### Phase 5 tests

- `test/helpers/llm-judge-provider.test.ts`
  - provider adapter contract tests
  - Anthropic adapter compatibility tests
- script-level assertions (spawn-based)
  - `test:e2e:codex` command works
  - eval script provider routing is deterministic
- `test/helpers/eval-store.test.ts` (extend)
  - artifact schema compatibility when provider field is present

### Phase 6 tests

- `test/release-gate.test.ts`
  - requires 2 consecutive Codex E2E passes for default switch
- `test/provider-default-switch.test.ts`
  - gray rollout default remains Claude
- `test/provider-rollback.test.ts`
  - env-only rollback to Claude takes immediate effect

## 4. Definition of Done Template (Per Phase)

Each phase must capture:

- Checklist status: all checked
- Added/updated test files: exact paths listed
- Verification commands and pass summary
- Risk notes + rollback point
- Gate decision: `Pass` / `Fail`

## 5. Global Exit Criteria

- Codex E2E passes 2 consecutive runs
- Non-interactive automation path has no blocking question/tool request behavior
- `/review` and `/qa quick` smoke pass on intended providers
- Default switch and rollback are both tested and documented

## 6. Execution Handoff

- Freeze this design as implementation contract.
- Next step is to produce and execute a task-by-task implementation plan via writing-plans workflow.
