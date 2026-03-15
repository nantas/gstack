import { describe, expect, test } from 'bun:test';
import { createRunner } from './runner-factory';

describe('createRunner', () => {
  test('creates a claude runner', () => {
    const runner = createRunner('claude');
    expect(typeof runner.runSkillTest).toBe('function');
  });

  test('creates a codex runner', () => {
    const runner = createRunner('codex');
    expect(typeof runner.runSkillTest).toBe('function');
  });
});
