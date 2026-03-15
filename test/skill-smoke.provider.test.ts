import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { resolveProvider } from './helpers/provider-config';
import { createRunner } from './helpers/runner-factory';

const ROOT = path.resolve(import.meta.dir, '..');

describe('provider smoke baseline', () => {
  test('defaults to claude runner for smoke scenarios', () => {
    const provider = resolveProvider({});
    const runner = createRunner(provider);
    expect(provider).toBe('claude');
    expect(typeof runner.runSkillTest).toBe('function');
  });

  test('review and qa skills exist for smoke coverage targets', () => {
    const reviewSkill = path.join(ROOT, 'review', 'SKILL.md');
    const qaSkill = path.join(ROOT, 'qa', 'SKILL.md');
    expect(fs.existsSync(reviewSkill)).toBe(true);
    expect(fs.existsSync(qaSkill)).toBe(true);
  });
});
