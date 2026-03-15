export type AgentProvider = 'claude' | 'codex';

export function resolveProvider(
  env: Record<string, string | undefined> = process.env,
): AgentProvider {
  const value = env.GSTACK_AGENT_PROVIDER;
  return value === 'codex' ? 'codex' : 'claude';
}
