# Free Verification Scope (Default)

Last updated: 2026-03-15

## Goal

Lock routine regression to a zero model/API-cost path.

## Canonical command

```bash
bun run verify:free
```

This command runs:

1. `bun run test:regression:free`
2. `bun run skill:check`

## Included checks

- Browse CLI integration tests (`browse/test/**`)
- Skill/static validation tests in `test/**` (excluding eval suites)
- Skill documentation freshness/consistency checks
- Skill health dashboard checks

## Explicitly excluded by default

- `bun run test:evals`
- `bun run test:e2e`
- `bun run test:evals:codex`
- Any run requiring direct model API calls or paid eval budget

## Pass criteria

- `bun run verify:free` exits with code `0`
- No failing tests in included scope
- No failing checks in `skill:check`

## When to run paid evals

Only when explicitly requested for release gating or provider/E2E behavior validation.
