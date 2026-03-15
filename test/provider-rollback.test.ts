import { describe, expect, test } from 'bun:test';
import { resolveProvider } from './helpers/provider-config';

describe('provider rollback', () => {
  test('single env change rolls back to claude immediately', () => {
    expect(resolveProvider({ GSTACK_AGENT_PROVIDER: 'codex' })).toBe('codex');
    expect(resolveProvider({ GSTACK_AGENT_PROVIDER: 'claude' })).toBe('claude');
  });
});
