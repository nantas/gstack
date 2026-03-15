import { describe, expect, test } from 'bun:test';
import { parseNDJSON } from './claude-runner';

describe('claude-runner', () => {
  test('exports parseNDJSON with same behavior as legacy runner', () => {
    const parsed = parseNDJSON([
      '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"echo ok"}}]}}',
      '{"type":"result","subtype":"success","result":"ok"}',
    ]);
    expect(parsed.toolCalls).toHaveLength(1);
    expect(parsed.resultLine?.subtype).toBe('success');
  });
});
