export const SCRATCHPAD_TAG = 'scratchpad';

export function parseNoteTags(tags?: string[] | string | null): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter((t): t is string => typeof t === 'string');
  if (typeof tags === 'string') {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.filter((t): t is string => typeof t === 'string');
    } catch {
      return tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
  }
  return [];
}

export function isScratchpadNote(
  noteOrTags?: { tags?: string[] | string | null } | string[] | string | null
): boolean {
  if (!noteOrTags) return false;
  const tags =
    typeof noteOrTags === 'object' && noteOrTags !== null && 'tags' in noteOrTags
      ? (noteOrTags as { tags?: string[] | string | null }).tags
      : noteOrTags;
  const parsed = parseNoteTags(tags as any);
  return parsed.some((t) => t.toLowerCase() === SCRATCHPAD_TAG);
}

export function formatScratchpadTags(existingTags?: string[] | string | null): string[] {
  const current = parseNoteTags(existingTags);
  if (current.some((t) => t.toLowerCase() === SCRATCHPAD_TAG)) {
    return current;
  }
  return [...current, SCRATCHPAD_TAG];
}

export function removeScratchpadTag(existingTags?: string[] | string | null): string[] {
  const current = parseNoteTags(existingTags);
  return current.filter((t) => t.toLowerCase() !== SCRATCHPAD_TAG);
}
