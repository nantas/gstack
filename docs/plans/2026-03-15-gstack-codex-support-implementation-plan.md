# gstack Codex Dual-Track Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute Phase 0-6 to add Codex dual-track support while preserving Claude fallback, with explicit phase gates and test coverage.

**Architecture:** Introduce a provider-agnostic runner contract, implement Claude and Codex runner adapters, and route E2E/eval/tooling through provider-aware factories. Then providerize templates and install paths so interactive and non-interactive tracks are both supported. Ship behind a default-Claude rollout with tested rollback.

**Tech Stack:** Bun, TypeScript, Bun test, shell-based integration tests, SKILL template generator.

---

### Task 1: Provider Config and Runner Factory (Phase 0)

**Files:**
- Create: `test/helpers/provider-config.ts`
- Create: `test/helpers/runner-factory.ts`
- Create: `test/helpers/provider-config.test.ts`
- Create: `test/helpers/runner-factory.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, test, expect } from 'bun:test';
import { resolveProvider } from './provider-config';

describe('resolveProvider', () => {
  test('defaults to claude', () => {
    expect(resolveProvider({})).toBe('claude');
  });
});
```

**Step 2: Run tests to verify failures**

Run: `bun test test/helpers/provider-config.test.ts test/helpers/runner-factory.test.ts`
Expected: FAIL (missing modules/functions).

**Step 3: Add minimal implementation**

```ts
export type AgentProvider = 'claude' | 'codex';
export function resolveProvider(env: Record<string, string | undefined>): AgentProvider {
  return env.GSTACK_AGENT_PROVIDER === 'codex' ? 'codex' : 'claude';
}
```

**Step 4: Run tests to verify pass**

Run: `bun test test/helpers/provider-config.test.ts test/helpers/runner-factory.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add test/helpers/provider-config.ts test/helpers/runner-factory.ts test/helpers/provider-config.test.ts test/helpers/runner-factory.test.ts
git commit -m "test+refactor: add provider config and runner factory"
```

### Task 2: Normalize Runner Types (Phase 1)

**Files:**
- Create: `test/helpers/runner-types.ts`
- Create: `test/helpers/runner-types.test.ts`

**Step 1: Write failing contract tests**

```ts
import { expect, test } from 'bun:test';
import { assertRunnerResult } from './runner-types';

test('runner result contract', () => {
  expect(() => assertRunnerResult({ exitReason: 'success' })).toThrow();
});
```

**Step 2: Run tests**

Run: `bun test test/helpers/runner-types.test.ts`
Expected: FAIL.

**Step 3: Implement shared types and assertion helper**

```ts
export interface SkillTestResult { toolCalls: any[]; browseErrors: string[]; exitReason: string; duration: number; output: string; costEstimate: any; transcript: any[]; }
```

**Step 4: Re-run tests**

Run: `bun test test/helpers/runner-types.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add test/helpers/runner-types.ts test/helpers/runner-types.test.ts
git commit -m "refactor: add shared runner type contract"
```

### Task 3: Extract Claude Runner Adapter (Phase 1)

**Files:**
- Create: `test/helpers/claude-runner.ts`
- Modify: `test/helpers/session-runner.ts`
- Modify: `test/helpers/session-runner.test.ts`
- Modify: `test/helpers/observability.test.ts`

**Step 1: Write/adjust failing tests for import path and behavior parity**

Run: `bun test test/helpers/session-runner.test.ts test/helpers/observability.test.ts`
Expected: FAIL after temporary import rewiring.

**Step 2: Move logic into `claude-runner.ts` and keep compatibility shim**

```ts
export { parseNDJSON, runSkillTest, sanitizeTestName } from './claude-runner';
```

**Step 3: Verify parity**

Run: `bun test test/helpers/session-runner.test.ts test/helpers/observability.test.ts`
Expected: PASS (no behavior regression).

**Step 4: Commit**

```bash
git add test/helpers/claude-runner.ts test/helpers/session-runner.ts test/helpers/session-runner.test.ts test/helpers/observability.test.ts
git commit -m "refactor: extract claude runner adapter with compatibility shim"
```

### Task 4: Codex JSONL Parser (Phase 2)

**Files:**
- Create: `test/helpers/codex-jsonl-parser.ts`
- Create: `test/helpers/codex-jsonl-parser.test.ts`

**Step 1: Write failing parser tests for success/failure/precedence**

```ts
test('turn.failed wins over zero exit code', () => {
  const r = parseCodexJSONL(['{"type":"turn.failed"}'], 0);
  expect(r.exitReason).toBe('turn_failed');
});
```

**Step 2: Run tests**

Run: `bun test test/helpers/codex-jsonl-parser.test.ts`
Expected: FAIL.

**Step 3: Implement parser and precedence rules**

Rule order:
1. explicit error events
2. `turn.failed`
3. process timeout
4. exit code
5. success

**Step 4: Re-run tests**

Run: `bun test test/helpers/codex-jsonl-parser.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add test/helpers/codex-jsonl-parser.ts test/helpers/codex-jsonl-parser.test.ts
git commit -m "feat: add codex jsonl parser with failure precedence rules"
```

### Task 5: Codex Runner Adapter (Phase 2)

**Files:**
- Create: `test/helpers/codex-runner.ts`
- Create: `test/helpers/codex-runner.test.ts`
- Modify: `test/helpers/runner-factory.ts`

**Step 1: Write failing tests for codex command assembly and mapping**

Expected command shape:

```bash
codex exec -C "<repo>" -s danger-full-access --ephemeral --json -c "projects.\"<repo>\".trust_level=\"trusted\"" "<prompt>"
```

**Step 2: Run tests**

Run: `bun test test/helpers/codex-runner.test.ts test/helpers/runner-factory.test.ts`
Expected: FAIL.

**Step 3: Implement codex runner with mocked spawn-friendly seams**

Add injectable spawn function in tests to avoid real Codex binary dependency.

**Step 4: Re-run tests**

Run: `bun test test/helpers/codex-runner.test.ts test/helpers/runner-factory.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add test/helpers/codex-runner.ts test/helpers/codex-runner.test.ts test/helpers/runner-factory.ts
git commit -m "feat: add codex runner adapter and factory routing"
```

### Task 6: E2E Provider Routing and Claude Regression (Phase 1/2 Gate)

**Files:**
- Modify: `test/skill-e2e.test.ts`
- Create: `test/skill-e2e-codex.test.ts`
- Create: `test/skill-smoke.provider.test.ts`

**Step 1: Add failing tests for provider selection in E2E harness**

Run: `bun test test/skill-smoke.provider.test.ts`
Expected: FAIL.

**Step 2: Route E2E through factory**

Replace direct `runSkillTest` import with provider-selected runner.

**Step 3: Add one minimal codex non-interactive E2E case**

Case: setup block + one browse command flow that does not require interactive question handling.

**Step 4: Verify**

Run:
- `bun test test/skill-smoke.provider.test.ts`
- `bun test test/skill-e2e.test.ts --timeout 120000`

Expected: PASS for unit/smoke on local env.

**Step 5: Commit**

```bash
git add test/skill-e2e.test.ts test/skill-e2e-codex.test.ts test/skill-smoke.provider.test.ts
git commit -m "refactor: route e2e via provider runners and add codex minimal e2e"
```

### Task 7: Providerize Skill Template Generation (Phase 3)

**Files:**
- Modify: `scripts/gen-skill-docs.ts`
- Modify: `SKILL.md.tmpl`
- Modify: `review/SKILL.md.tmpl`
- Modify: `ship/SKILL.md.tmpl`
- Modify: `qa/SKILL.md.tmpl`
- Modify: generated files `SKILL.md`, `review/SKILL.md`, `ship/SKILL.md`, `qa/SKILL.md`
- Modify: `test/gen-skill-docs.test.ts`
- Modify: `test/skill-validation.test.ts`

**Step 1: Write failing generator/validation tests first**

Add assertions that generated docs do not hardcode `.claude/skills` in providerized regions.

**Step 2: Run tests**

Run: `bun test test/gen-skill-docs.test.ts test/skill-validation.test.ts`
Expected: FAIL.

**Step 3: Implement placeholder strategy**

Add template resolvers for provider-aware setup/update snippets and question semantics.

**Step 4: Regenerate and verify**

Run:
- `bun run gen:skill-docs`
- `bun test test/gen-skill-docs.test.ts test/skill-validation.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/gen-skill-docs.ts SKILL.md.tmpl review/SKILL.md.tmpl ship/SKILL.md.tmpl qa/SKILL.md.tmpl SKILL.md review/SKILL.md ship/SKILL.md qa/SKILL.md test/gen-skill-docs.test.ts test/skill-validation.test.ts
git commit -m "feat: providerize high-impact skill templates and generator"
```

### Task 8: Setup Path Lifecycle for Claude and Codex (Phase 4)

**Files:**
- Modify: `setup`
- Create: `test/setup-paths.test.ts`
- Modify: `test/skill-e2e.test.ts` (setup block branch checks if needed)

**Step 1: Write failing setup path tests**

Cases:
- inside `.claude/skills`
- inside `.codex/skills`
- outside skills directory

**Step 2: Run tests**

Run: `bun test test/setup-paths.test.ts`
Expected: FAIL.

**Step 3: Update setup script with dual-ecosystem linking rules**

Preserve existing Claude behavior; add Codex branch without destructive operations.

**Step 4: Re-run tests**

Run: `bun test test/setup-paths.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add setup test/setup-paths.test.ts test/skill-e2e.test.ts
git commit -m "feat: support setup lifecycle for claude and codex skills dirs"
```

### Task 9: Docs and Architecture Updates (Phase 4)

**Files:**
- Modify: `README.md`
- Modify: `BROWSER.md`
- Modify: `AGENTS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `CONTRIBUTING.md`

**Step 1: Add failing doc assertions (optional lightweight)**

If adding doc tests is too heavy, use static grep checks in test script.

**Step 2: Update docs**

Add Codex install flow, provider switch docs, troubleshooting, and updated tier definitions.

**Step 3: Verify consistency**

Run:
- `bun run gen:skill-docs --dry-run`
- `bun run skill:check`

Expected: PASS.

**Step 4: Commit**

```bash
git add README.md BROWSER.md AGENTS.md ARCHITECTURE.md CONTRIBUTING.md
git commit -m "docs: add codex support, provider lifecycle, and troubleshooting"
```

### Task 10: Eval Provider Abstraction and Scripts (Phase 5)

**Files:**
- Modify: `test/helpers/llm-judge.ts`
- Create: `test/helpers/llm-judge-provider.test.ts`
- Modify: `test/skill-llm-eval.test.ts`
- Modify: `package.json`

**Step 1: Write failing adapter contract tests**

Run: `bun test test/helpers/llm-judge-provider.test.ts`
Expected: FAIL.

**Step 2: Implement provider adapter layer**

Keep Anthropic adapter as default fallback until explicit provider switch.

**Step 3: Add script entries**

- `test:e2e:codex`
- optional `test:evals:codex`

**Step 4: Verify**

Run:
- `bun test test/helpers/llm-judge-provider.test.ts`
- `bun test test/helpers/eval-store.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add test/helpers/llm-judge.ts test/helpers/llm-judge-provider.test.ts test/skill-llm-eval.test.ts package.json
git commit -m "feat: decouple eval judge provider and add codex eval scripts"
```

### Task 11: Release Gate and Rollback Tests (Phase 6)

**Files:**
- Create: `test/release-gate.test.ts`
- Create: `test/provider-default-switch.test.ts`
- Create: `test/provider-rollback.test.ts`
- Create: `test/helpers/release-gate.ts`

**Step 1: Write failing tests for 2-pass switch policy**

```ts
test('default switch allowed only after 2 consecutive codex e2e passes', () => {
  expect(canSwitchDefault(['pass', 'fail', 'pass'])).toBe(false);
});
```

**Step 2: Run tests**

Run: `bun test test/release-gate.test.ts test/provider-default-switch.test.ts test/provider-rollback.test.ts`
Expected: FAIL.

**Step 3: Implement gate helpers and env rollback behavior**

**Step 4: Re-run tests**

Run: `bun test test/release-gate.test.ts test/provider-default-switch.test.ts test/provider-rollback.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add test/release-gate.test.ts test/provider-default-switch.test.ts test/provider-rollback.test.ts test/helpers/release-gate.ts
git commit -m "test: add phase-6 release gate and rollback coverage"
```

### Task 12: Phase Gate Verification and Final Regression

**Files:**
- Modify: `docs/plans/2026-03-15-gstack-codex-support-design.md` (mark completion)
- Create: `docs/plans/2026-03-15-gstack-codex-support-phase-report.md`

**Step 1: Run full free test suite**

Run: `bun test`
Expected: PASS.

**Step 2: Run provider-specific targeted suites**

Run:
- `bun run test:e2e` (Claude path baseline)
- `bun run test:e2e:codex` (Codex path)

Expected: PASS with artifacts.

**Step 3: Run Codex E2E twice for switch gate**

Run:
- `bun run test:e2e:codex`
- `bun run test:e2e:codex`

Expected: 2 consecutive PASS before default switch.

**Step 4: Publish phase report**

Include:
- checklist completion by phase
- test evidence summary
- rollback command and trigger signals

**Step 5: Final commit**

```bash
git add docs/plans/2026-03-15-gstack-codex-support-design.md docs/plans/2026-03-15-gstack-codex-support-phase-report.md
git commit -m "docs: record phase gate evidence for codex support rollout"
```

---

## Guardrails During Execution

- Use `@superpowers:test-driven-development` before each implementation task.
- Use `@superpowers:verification-before-completion` before claiming any phase is complete.
- Do not begin Phase N+1 before Phase N gate is explicitly marked `Pass`.

## Suggested Execution Rhythm

1. Complete one task.
2. Run only the smallest relevant tests.
3. Commit.
4. Run phase gate tests.
5. Move to next phase.
