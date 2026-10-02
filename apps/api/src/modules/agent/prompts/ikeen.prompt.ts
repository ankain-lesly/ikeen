import {
  PROMPT_SEGMENT_BOUNDARIES,
  PROMPT_SEGMENT_IDENTITY,
  PROMPT_SEGMENT_LINK_AND_FORMATTING,
  PROMPT_SEGMENT_MEMORY_LOGGING,
  PROMPT_SEGMENT_PERSONALITY_AND_TONE,
  PROMPT_SEGMENT_TOOL_ROUTING,
  PROMPT_SEGMENT_WORKSPACE_AND_GUARDRAILS,
  buildExecutionBudgetSegment,
  buildWebResearchSegment,
} from './segments.js';
import { DEFAULT_AGENT_MAX_STEPS } from '../agent-config.js';

export interface KnownMemory {
  category: string;
  description: string;
}

export interface UserPromptContext {
  firstName?: string;
  username?: string;
  memories?: KnownMemory[];
  maxSteps?: number;
  webResearch?: boolean;
  today?: string;
}

const MEMORY_DESCRIPTION_MAX = 200;

function formatKnownMemories(memories: KnownMemory[]): string {
  const lines = memories
    .map((memory) => {
      const description = memory.description.trim().slice(0, MEMORY_DESCRIPTION_MAX);
      if (!description) return null;
      return `- [${memory.category}] ${description}`;
    })
    .filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return '';
  }

  return `\n\n## Known about user\n${lines.join('\n')}`;
}

/**
 * Builds the complete instructions prompt for the iKeen agent.
 */
export function buildIkeenInstructions(user?: UserPromptContext): string {
  const greetingSegment = user?.firstName
    ? `\n\n## User Context\nYou are working directly with ${user.firstName} (@${user.username || 'user'}). Greet them warmly and tailor brainstorms to their workspace.`
    : '';
  const memorySegment = formatKnownMemories(user?.memories ?? []);
  const executionBudget = buildExecutionBudgetSegment(
    user?.maxSteps ?? DEFAULT_AGENT_MAX_STEPS,
    { webResearch: Boolean(user?.webResearch) },
  );
  const webResearchSegment =
    user?.webResearch && user.today
      ? `\n${buildWebResearchSegment(user.today)}\n`
      : '';

  return `${PROMPT_SEGMENT_IDENTITY}${greetingSegment}${memorySegment}

${executionBudget}

${PROMPT_SEGMENT_PERSONALITY_AND_TONE}
${webResearchSegment}
${PROMPT_SEGMENT_LINK_AND_FORMATTING}

${PROMPT_SEGMENT_TOOL_ROUTING}

${PROMPT_SEGMENT_WORKSPACE_AND_GUARDRAILS}

${PROMPT_SEGMENT_BOUNDARIES}

${PROMPT_SEGMENT_MEMORY_LOGGING}`;
}
