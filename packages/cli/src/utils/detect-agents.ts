import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type AgentType = 'claude' | 'gemini' | 'codex';

export interface DetectedAgent {
  type: AgentType;
  commandDir: string;
}

/**
 * Detect which AI agents are configured in the project directory.
 * Returns the list of detected agents and their command directories.
 */
export function detectAgents(projectDir: string): DetectedAgent[] {
  const agents: DetectedAgent[] = [];

  // Claude Code: .claude/ directory
  if (existsSync(join(projectDir, '.claude'))) {
    agents.push({ type: 'claude', commandDir: '.claude/commands' });
  }

  // Gemini CLI: .gemini/ directory
  if (existsSync(join(projectDir, '.gemini'))) {
    agents.push({ type: 'gemini', commandDir: '.gemini/commands' });
  }

  // Codex: .codex/ directory or codex config
  if (existsSync(join(projectDir, '.codex'))) {
    agents.push({ type: 'codex', commandDir: '.codex/commands' });
  }

  return agents;
}

/**
 * Get all agent types. Used when no agents are detected (install all).
 */
export function getAllAgentTypes(): AgentType[] {
  return ['claude', 'gemini', 'codex'];
}
