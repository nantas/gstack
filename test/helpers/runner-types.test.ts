import { describe, expect, test } from 'bun:test';
import { assertRunnerResult } from './runner-types';

describe('runner-types', () => {
  test('throws when required fields are missing', () => {
    expect(() => assertRunnerResult({ exitReason: 'success' })).toThrow(
      'Missing runner result fields',
    );
  });

  test('accepts well-shaped runner results', () => {
    expect(() =>
      assertRunnerResult({
        toolCalls: [],
        browseErrors: [],
        exitReason: 'success',
        duration: 1,
        output: '',
        costEstimate: {
          inputChars: 0,
          outputChars: 0,
          estimatedTokens: 0,
          estimatedCost: 0,
          turnsUsed: 0,
        },
        transcript: [],
      }),
    ).not.toThrow();
  });
});
