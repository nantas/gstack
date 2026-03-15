import { parseCodexJSONL } from './codex-jsonl-parser';
import type { SkillTestOptions, SkillTestResult } from './runner-types';

export interface SpawnProcessLike {
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  exited: Promise<number>;
  kill: () => void;
  pid: number;
}

export type SpawnLike = (
  cmd: string[],
  opts: { cwd: string; stdout: 'pipe'; stderr: 'pipe' },
) => SpawnProcessLike;

export type CodexRunOptions = SkillTestOptions & {
  spawn?: SpawnLike;
};

function buildCodexCommand(workingDirectory: string, prompt: string): string[] {
  return [
    'codex',
    'exec',
    '-C',
    workingDirectory,
    '-s',
    'danger-full-access',
    '--ephemeral',
    '--json',
    '-c',
    `projects."${workingDirectory}".trust_level="trusted"`,
    prompt,
  ];
}

export async function runCodexSkillTest(options: CodexRunOptions): Promise<SkillTestResult> {
  const {
    prompt,
    workingDirectory,
    timeout = 120_000,
    spawn = Bun.spawn as unknown as SpawnLike,
  } = options;

  const startTime = Date.now();
  const cmd = buildCodexCommand(workingDirectory, prompt);
  const proc = spawn(cmd, {
    cwd: workingDirectory,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stderrPromise = new Response(proc.stderr).text();
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  const lines: string[] = [];
  let timedOut = false;
  let buf = '';

  const timeoutId = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeout);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const split = buf.split('\n');
      buf = split.pop() || '';
      for (const line of split) {
        if (line.trim()) lines.push(line);
      }
    }
  } catch {
    // Allow parser/exit fallback to handle stream failures.
  }

  if (buf.trim()) lines.push(buf);

  const exitCode = await proc.exited;
  const stderr = await stderrPromise;
  clearTimeout(timeoutId);

  const parsed = parseCodexJSONL(lines, exitCode, { timedOut, stderr });

  return {
    toolCalls: parsed.toolCalls,
    browseErrors: [],
    exitReason: parsed.exitReason,
    duration: Date.now() - startTime,
    output: parsed.output,
    costEstimate: {
      inputChars: prompt.length,
      outputChars: parsed.output.length,
      estimatedTokens: 0,
      estimatedCost: 0,
      turnsUsed: 0,
    },
    transcript: parsed.transcript,
  };
}
