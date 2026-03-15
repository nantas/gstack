import { describe, expect, test } from 'bun:test';
import {
  callJudge,
  createMockJudgeProvider,
  resolveJudgeProviderName,
} from './llm-judge';

describe('llm-judge provider abstraction', () => {
  test('defaults to claude-cli provider name', () => {
    expect(resolveJudgeProviderName({})).toBe('claude-cli');
  });

  test('switches to anthropic provider name via env', () => {
    expect(resolveJudgeProviderName({ GSTACK_JUDGE_PROVIDER: 'anthropic' })).toBe('anthropic');
  });

  test('switches to mock provider name via env', () => {
    expect(resolveJudgeProviderName({ GSTACK_JUDGE_PROVIDER: 'mock' })).toBe('mock');
  });

  test('callJudge parses JSON through mock provider', async () => {
    const provider = createMockJudgeProvider({
      GSTACK_JUDGE_MOCK_RESPONSE: '{"clarity":5,"completeness":4,"actionability":5,"reasoning":"ok"}',
    });
    const result = await callJudge<{ clarity: number; completeness: number; actionability: number }>('ignored', {
      provider,
    });
    expect(result.clarity).toBe(5);
    expect(result.completeness).toBe(4);
    expect(result.actionability).toBe(5);
  });
});
