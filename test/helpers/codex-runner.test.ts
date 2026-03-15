import { describe, expect, test } from 'bun:test';
import { runCodexSkillTest } from './codex-runner';

function textStream(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

describe('runCodexSkillTest', () => {
  test('assembles codex exec command with json + ephemeral flags', async () => {
    const seen: { cmd?: string[]; cwd?: string } = {};
    const result = await runCodexSkillTest({
      prompt: 'say hi',
      workingDirectory: '/tmp/repo',
      spawn: (cmd, opts) => {
        seen.cmd = cmd;
        seen.cwd = opts.cwd;
        return {
          stdout: textStream('{"type":"turn.completed"}\n'),
          stderr: textStream(''),
          exited: Promise.resolve(0),
          kill: () => {},
          pid: 123,
        };
      },
    });

    expect(result.exitReason).toBe('success');
    expect(seen.cwd).toBe('/tmp/repo');
    expect(seen.cmd).toBeDefined();
    expect(seen.cmd?.[0]).toBe('codex');
    expect(seen.cmd).toContain('exec');
    expect(seen.cmd).toContain('--json');
    expect(seen.cmd).toContain('--ephemeral');
  });

  test('maps tool call events into normalized result', async () => {
    const ndjson = [
      JSON.stringify({
        type: 'item.completed',
        item: { type: 'tool_call', name: 'Bash', input: { command: 'pwd' }, output: '/tmp\n' },
      }),
      JSON.stringify({ type: 'turn.completed' }),
    ].join('\n');

    const result = await runCodexSkillTest({
      prompt: 'run pwd',
      workingDirectory: '/tmp/repo',
      spawn: () => ({
        stdout: textStream(ndjson),
        stderr: textStream(''),
        exited: Promise.resolve(0),
        kill: () => {},
        pid: 123,
      }),
    });

    expect(result.toolCalls).toEqual([
      { tool: 'Bash', input: { command: 'pwd' }, output: '/tmp\n' },
    ]);
  });
});
