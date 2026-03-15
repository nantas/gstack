/**
 * Shared LLM-as-judge helpers for eval and E2E tests.
 *
 * Provides callJudge (generic JSON-from-LLM), judge (doc quality scorer),
 * and outcomeJudge (planted-bug detection scorer).
 */

import Anthropic from '@anthropic-ai/sdk';
import { spawnSync } from 'child_process';

export interface JudgeScore {
  clarity: number;       // 1-5
  completeness: number;  // 1-5
  actionability: number; // 1-5
  reasoning: string;
}

export interface OutcomeJudgeResult {
  detected: string[];
  missed: string[];
  false_positives: number;
  detection_rate: number;
  evidence_quality: number;
  reasoning: string;
}

export type JudgeProviderName = 'anthropic' | 'claude-cli' | 'mock';

export interface JudgeProvider {
  name: JudgeProviderName;
  generate(prompt: string): Promise<string>;
}

export function resolveJudgeProviderName(
  env: Record<string, string | undefined> = process.env,
): JudgeProviderName {
  const configured = env.GSTACK_JUDGE_PROVIDER;
  if (configured === 'anthropic' || configured === 'claude-cli' || configured === 'mock') {
    return configured;
  }
  // Default to CLI-based judge so evals can run from existing `claude` login state.
  return 'claude-cli';
}

function extractJsonObject(text: string): string {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Judge returned non-JSON: ${text.slice(0, 200)}`);
  }
  return jsonMatch[0];
}

export function createAnthropicJudgeProvider(
  client = new Anthropic(),
): JudgeProvider {
  return {
    name: 'anthropic',
    async generate(prompt: string): Promise<string> {
      const makeRequest = () => client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      let response;
      try {
        response = await makeRequest();
      } catch (err: any) {
        if (err.status === 429) {
          await new Promise(r => setTimeout(r, 1000));
          response = await makeRequest();
        } else {
          throw err;
        }
      }

      return response.content[0]?.type === 'text'
        ? response.content[0].text
        : '';
    },
  };
}

export function createClaudeCliJudgeProvider(): JudgeProvider {
  return {
    name: 'claude-cli',
    async generate(prompt: string): Promise<string> {
      const result = spawnSync('claude', [
        '-p',
        '--max-turns',
        '2',
        '--dangerously-skip-permissions',
      ], {
        input: prompt,
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 120_000,
      });

      const stdout = result.stdout?.toString() || '';
      const stderr = result.stderr?.toString() || '';
      if (result.status !== 0) {
        throw new Error(`claude-cli judge failed (exit ${result.status}): ${stderr.slice(0, 300)}`);
      }
      if (!stdout.trim()) {
        throw new Error(`claude-cli judge returned empty output: ${stderr.slice(0, 300)}`);
      }
      return stdout;
    },
  };
}

export function createMockJudgeProvider(
  env: Record<string, string | undefined> = process.env,
): JudgeProvider {
  return {
    name: 'mock',
    async generate(): Promise<string> {
      return env.GSTACK_JUDGE_MOCK_RESPONSE
        || '{"clarity":4,"completeness":4,"actionability":4,"reasoning":"mock"}';
    },
  };
}

export function resolveJudgeProvider(
  env: Record<string, string | undefined> = process.env,
): JudgeProvider {
  const provider = resolveJudgeProviderName(env);
  if (provider === 'mock') return createMockJudgeProvider(env);
  if (provider === 'anthropic') return createAnthropicJudgeProvider();
  return createClaudeCliJudgeProvider();
}

/**
 * Call the configured judge provider and extract JSON response.
 */
export async function callJudge<T>(
  prompt: string,
  options: { provider?: JudgeProvider } = {},
): Promise<T> {
  const provider = options.provider || resolveJudgeProvider();
  const text = await provider.generate(prompt);
  return JSON.parse(extractJsonObject(text)) as T;
}

/**
 * Score documentation quality on clarity/completeness/actionability (1-5).
 */
export async function judge(section: string, content: string): Promise<JudgeScore> {
  return callJudge<JudgeScore>(`You are evaluating documentation quality for an AI coding agent's CLI tool reference.

The agent reads this documentation to learn how to use a headless browser CLI. It needs to:
1. Understand what each command does
2. Know what arguments to pass
3. Know valid values for enum-like parameters
4. Construct correct command invocations without guessing

Rate the following ${section} on three dimensions (1-5 scale):

- **clarity** (1-5): Can an agent understand what each command/flag does from the description alone?
- **completeness** (1-5): Are arguments, valid values, and important behaviors documented? Would an agent need to guess anything?
- **actionability** (1-5): Can an agent construct correct command invocations from this reference alone?

Scoring guide:
- 5: Excellent — no ambiguity, all info present
- 4: Good — minor gaps an experienced agent could infer
- 3: Adequate — some guessing required
- 2: Poor — significant info missing
- 1: Unusable — agent would fail without external help

Respond with ONLY valid JSON in this exact format:
{"clarity": N, "completeness": N, "actionability": N, "reasoning": "brief explanation"}

Here is the ${section} to evaluate:

${content}`);
}

/**
 * Evaluate a QA report against planted-bug ground truth.
 * Returns detection metrics for the planted bugs.
 */
export async function outcomeJudge(
  groundTruth: any,
  report: string,
): Promise<OutcomeJudgeResult> {
  return callJudge<OutcomeJudgeResult>(`You are evaluating a QA testing report against known ground truth bugs.

GROUND TRUTH (${groundTruth.total_bugs} planted bugs):
${JSON.stringify(groundTruth.bugs, null, 2)}

QA REPORT (generated by an AI agent):
${report}

For each planted bug, determine if the report identified it. A bug counts as
"detected" if the report describes the same defect, even if the wording differs.
Use the detection_hint keywords as guidance.
Prefer high recall: if the report describes the same root cause class
(validation gap, missing constraint, broken calculation, missing dependency,
console failure), count it as detected even when details are partial.
Only mark "missed" when there is no materially related finding in the report.

Also count false positives: issues in the report that don't correspond to any
planted bug AND are clearly incorrect claims.
Do NOT count extra plausible issues as false positives just because they are
outside the planted bug list.

Respond with ONLY valid JSON:
{
  "detected": ["bug-id-1", "bug-id-2"],
  "missed": ["bug-id-3"],
  "false_positives": 0,
  "detection_rate": 2,
  "evidence_quality": 4,
  "reasoning": "brief explanation"
}

Rules:
- "detected" and "missed" arrays must only contain IDs from the ground truth: ${groundTruth.bugs.map((b: any) => b.id).join(', ')}
- detection_rate = length of detected array
- Use semantic/root-cause matching over exact phrasing; do not require exact literals
- false_positives = count of clearly wrong bug claims (contradicted by page behavior), not merely additional findings
- evidence_quality (1-5): Do detected bugs have screenshots, repro steps, or specific element references?
  5 = excellent evidence for every bug, 1 = no evidence at all`);
}
