import { describe, expect, test } from 'bun:test';
import { resolveProvider } from './provider-config';

describe('resolveProvider', () => {
  test('defaults to claude when env is empty', () => {
    expect(resolveProvider({})).toBe('claude');
  });

  test('uses codex when explicitly configured', () => {
    expect(resolveProvider({ GSTACK_AGENT_PROVIDER: 'codex' })).toBe('codex');
  });

  test('falls back to claude for invalid values', () => {
    expect(resolveProvider({ GSTACK_AGENT_PROVIDER: 'something-else' })).toBe('claude');
  });
});
