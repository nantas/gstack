export interface ParsedCodexJSONL {
  transcript: any[];
  toolCalls: Array<{ tool: string; input: any; output: string }>;
  output: string;
  exitReason: string;
}

export function parseCodexJSONL(
  lines: string[],
  processExitCode: number,
  options: { timedOut?: boolean; stderr?: string } = {},
): ParsedCodexJSONL {
  const transcript: any[] = [];
  const toolCalls: ParsedCodexJSONL['toolCalls'] = [];
  const outputChunks: string[] = [];

  let sawError = false;
  let sawTurnFailed = false;

  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      transcript.push(event);

      if (event.type === 'error') {
        sawError = true;
      }
      if (event.type === 'turn.failed') {
        sawTurnFailed = true;
      }

      const item = event.item;
      if (
        event.type === 'item.completed' &&
        item &&
        ['tool_call', 'function_call', 'tool_use'].includes(item.type)
      ) {
        toolCalls.push({
          tool: item.name || item.tool_name || 'unknown',
          input: item.input || item.arguments || {},
          output: item.output || '',
        });
      }

      const itemText = typeof item?.text === 'string' ? item.text : '';
      const outputText = typeof event.output_text === 'string' ? event.output_text : '';
      if (itemText) outputChunks.push(itemText);
      if (outputText) outputChunks.push(outputText);
    } catch {
      // Ignore malformed lines.
    }
  }

  let exitReason = 'success';
  if (sawError) {
    exitReason = 'error_event';
  } else if (sawTurnFailed) {
    exitReason = 'turn_failed';
  } else if (options.timedOut) {
    exitReason = 'timeout';
  } else if (processExitCode !== 0) {
    exitReason = `exit_code_${processExitCode}`;
  }

  return {
    transcript,
    toolCalls,
    output: outputChunks.join('\n'),
    exitReason,
  };
}
