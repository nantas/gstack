export type E2EStatus = 'pass' | 'fail';

/**
 * Switch gate for default provider rollout.
 * Requires N consecutive passing Codex E2E runs at the tail.
 */
export function canSwitchDefaultProvider(
  history: E2EStatus[],
  requiredConsecutive = 2,
): boolean {
  if (requiredConsecutive <= 0) return true;
  if (history.length < requiredConsecutive) return false;
  const tail = history.slice(-requiredConsecutive);
  return tail.every(s => s === 'pass');
}
