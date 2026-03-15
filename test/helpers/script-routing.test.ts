import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

describe('package script routing', () => {
  test('includes codex e2e script', () => {
    expect(pkg.scripts['test:e2e:codex']).toBeTruthy();
    expect(pkg.scripts['test:e2e:codex']).toContain('GSTACK_AGENT_PROVIDER=codex');
  });

  test('includes codex eval script', () => {
    expect(pkg.scripts['test:evals:codex']).toBeTruthy();
    expect(pkg.scripts['test:evals:codex']).toContain('GSTACK_AGENT_PROVIDER=codex');
  });
});
