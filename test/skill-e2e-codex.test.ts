import { describe, expect, test } from 'bun:test';
import { runCodexSkillTest } from './helpers/codex-runner';

function textStream(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe('Codex E2E smoke', () => {
  test('non-interactive codex flow returns structured result', async () => {
    const stdout = [
      JSON.stringify({
        type: 'item.completed',
        item: { type: 'tool_call', name: 'Bash', input: { command: 'echo ok' }, output: 'ok\n' },
      }),
      JSON.stringify({ type: 'turn.completed', output_text: 'done' }),
    ].join('\n');

    const result = await runCodexSkillTest({
      prompt: 'run echo',
      workingDirectory: '/tmp/repo',
      spawn: () => ({
        stdout: textStream(stdout),
        stderr: textStream(''),
        exited: Promise.resolve(0),
        kill: () => {},
        pid: 456,
      }),
    });

    expect(result.exitReason).toBe('success');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.output).toContain('done');
  });
});
