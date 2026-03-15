import { describe, expect, test } from 'bun:test';
import { canSwitchDefaultProvider } from './helpers/release-gate';

describe('release gate', () => {
  test('requires two consecutive passes at the tail', () => {
    expect(canSwitchDefaultProvider(['pass'], 2)).toBe(false);
    expect(canSwitchDefaultProvider(['pass', 'fail'], 2)).toBe(false);
    expect(canSwitchDefaultProvider(['pass', 'pass'], 2)).toBe(true);
    expect(canSwitchDefaultProvider(['pass', 'fail', 'pass'], 2)).toBe(false);
    expect(canSwitchDefaultProvider(['fail', 'pass', 'pass'], 2)).toBe(true);
  });
});
