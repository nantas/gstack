import { describe, expect, test } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(import.meta.dir, '..');
const setupScript = fs.readFileSync(path.join(ROOT, 'setup'), 'utf-8');

describe('setup path lifecycle', () => {
  test('documents support for both .claude/skills and .codex/skills', () => {
    expect(setupScript).toContain('.claude/skills');
    expect(setupScript).toContain('.codex/skills');
  });

  test('links skills when parent directory basename is skills', () => {
    expect(setupScript).toContain('basename "$SKILLS_DIR"');
    expect(setupScript).toContain('[ "$SKILLS_BASENAME" = "skills" ]');
  });
});
