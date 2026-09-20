import {
  PROMPT_SEGMENT_BOUNDARIES,
  PROMPT_SEGMENT_IDENTITY,
  PROMPT_SEGMENT_LINK_AND_FORMATTING,
  PROMPT_SEGMENT_MEMORY_LOGGING,
  PROMPT_SEGMENT_PERSONALITY_AND_TONE,
  PROMPT_SEGMENT_TOOL_ROUTING,
} from './segments';

export interface UserPromptContext {
  firstName?: string;
  username?: string;
}

/**
 * Builds the complete instructions prompt for the iKeen agent.
 */
export function buildIkeenInstructions(user?: UserPromptContext): string {
  const greetingSegment = user?.firstName
    ? `\n\n## User Context\nYou are working directly with ${user.firstName} (@${user.username || 'user'}). Greet them warmly and tailor brainstorms to their workspace.`
    : '';

  return `${PROMPT_SEGMENT_IDENTITY}${greetingSegment}

${PROMPT_SEGMENT_PERSONALITY_AND_TONE}

${PROMPT_SEGMENT_LINK_AND_FORMATTING}

${PROMPT_SEGMENT_TOOL_ROUTING}

${PROMPT_SEGMENT_BOUNDARIES}

${PROMPT_SEGMENT_MEMORY_LOGGING}`;
}
