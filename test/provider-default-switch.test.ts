import { describe, expect, test } from 'bun:test';
import { resolveProvider } from './helpers/provider-config';

describe('provider default switch', () => {
  test('gray rollout keeps default provider as claude', () => {
    expect(resolveProvider({})).toBe('claude');
  });

  test('codex is only used when explicitly enabled', () => {
    expect(resolveProvider({ GSTACK_AGENT_PROVIDER: 'codex' })).toBe('codex');
  });
});
