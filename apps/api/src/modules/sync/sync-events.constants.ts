/**
 * Canonical mapping from tool name to mutated sync entities.
 * Shared by both Agent Service (turn-end consolidated invalidation)
 * and MCP Server (single-tool execution completion invalidation).
 */
export const TOOL_MUTATION_ENTITIES: Record<string, readonly string[]> = {
  createNote: ['notes', 'note_blocks'],
  updateNote: ['notes', 'note_blocks'],
  addBlock: ['notes', 'note_blocks'],
  updateBlock: ['notes', 'note_blocks'],
  deleteBlock: ['notes', 'note_blocks'],
  attachImage: ['notes', 'note_blocks'],
  deleteNote: ['notes', 'note_blocks'],
  pinNote: ['notes'],
  archiveNote: ['notes'],
  createFolder: ['folders'],
  updateFolder: ['folders'],
  organizeNote: ['notes', 'folders'],
  setReminder: ['reminders'],
  completeReminder: ['reminders'],
  cancelReminder: ['reminders'],
} as const;

/**
 * Returns mutated entities for a given tool name, or empty array if read-only.
 */
export function getToolMutatedEntities(toolName: string): readonly string[] {
  // Strip optional tool- or ikeen_ prefix if present
  const normalized = toolName.replace(/^tool-/, '').replace(/^ikeen_/, '');
  // Convert snake_case (e.g. ikeen_attach_image -> attachImage)
  const camelCase = normalized.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

  return TOOL_MUTATION_ENTITIES[camelCase] ?? TOOL_MUTATION_ENTITIES[normalized] ?? [];
}
