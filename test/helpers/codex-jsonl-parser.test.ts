import { describe, expect, test } from 'bun:test';
import { parseCodexJSONL } from './codex-jsonl-parser';

describe('parseCodexJSONL', () => {
  test('extracts tool calls from item.completed events', () => {
    const parsed = parseCodexJSONL([
      JSON.stringify({
        type: 'item.completed',
        item: {
          type: 'tool_call',
          name: 'Bash',
          input: { command: 'echo hi' },
          output: 'hi\n',
        },
      }),
    ], 0);

    expect(parsed.toolCalls).toEqual([
      { tool: 'Bash', input: { command: 'echo hi' }, output: 'hi\n' },
    ]);
  });

  test('turn.failed takes precedence over zero exit code', () => {
    const parsed = parseCodexJSONL([
      JSON.stringify({ type: 'turn.failed' }),
    ], 0);
    expect(parsed.exitReason).toBe('turn_failed');
  });

  test('error event takes precedence over turn.failed', () => {
    const parsed = parseCodexJSONL([
      JSON.stringify({ type: 'turn.failed' }),
      JSON.stringify({ type: 'error', error: { message: 'boom' } }),
    ], 0);
    expect(parsed.exitReason).toBe('error_event');
  });

  test('falls back to process exit code when no explicit failure events', () => {
    expect(parseCodexJSONL([], 0).exitReason).toBe('success');
    expect(parseCodexJSONL([], 7).exitReason).toBe('exit_code_7');
  });

  test('skips malformed json lines', () => {
    const parsed = parseCodexJSONL(['{bad json', JSON.stringify({ type: 'turn.completed' })], 0);
    expect(parsed.transcript).toHaveLength(1);
  });
});
