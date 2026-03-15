export interface CostEstimate {
  inputChars: number;
  outputChars: number;
  estimatedTokens: number;
  estimatedCost: number;
  turnsUsed: number;
}

export interface SkillTestResult {
  toolCalls: Array<{ tool: string; input: any; output: string }>;
  browseErrors: string[];
  exitReason: string;
  duration: number;
  output: string;
  costEstimate: CostEstimate;
  transcript: any[];
}

export interface SkillTestOptions {
  prompt: string;
  workingDirectory: string;
  maxTurns?: number;
  allowedTools?: string[];
  timeout?: number;
  testName?: string;
  runId?: string;
}

export interface AgentRunner {
  runSkillTest(options: SkillTestOptions): Promise<SkillTestResult>;
}

export function assertRunnerResult(value: unknown): asserts value is SkillTestResult {
  const r = value as Partial<SkillTestResult> | null;
  const hasCoreFields = !!(
    r &&
    Array.isArray(r.toolCalls) &&
    Array.isArray(r.browseErrors) &&
    typeof r.exitReason === 'string' &&
    typeof r.duration === 'number' &&
    typeof r.output === 'string' &&
    r.costEstimate &&
    Array.isArray(r.transcript)
  );

  if (!hasCoreFields) {
    throw new Error('Missing runner result fields');
  }
}
