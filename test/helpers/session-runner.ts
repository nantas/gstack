/**
 * Backward-compatible shim.
 *
 * New code should import from ./claude-runner, but existing tests and callers
 * still import ./session-runner.
 */

export { parseNDJSON, runSkillTest, sanitizeTestName } from './claude-runner';
export type {
  CostEstimate,
  SkillTestResult,
  ParsedNDJSON,
} from './claude-runner';
