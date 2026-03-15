import { runSkillTest } from './session-runner';
import type { AgentProvider } from './provider-config';
import type { AgentRunner } from './runner-types';
import { runCodexSkillTest } from './codex-runner';

export function createRunner(provider: AgentProvider): AgentRunner {
  if (provider === 'claude') {
    return { runSkillTest };
  }
  return { runSkillTest: runCodexSkillTest };
}
