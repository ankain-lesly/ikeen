import type { Note } from "@repo/types";
import type { NoteSortField, SortDirection } from "@/lib/stores/workspace-store";

export interface NoteFilterOptions {
  searchQuery: string;
  sortBy: NoteSortField;
  sortDirection: SortDirection;
  pinnedFirst?: boolean;
}

export function filterAndSortNotes<T extends Note>(
  notes: T[],
  options: NoteFilterOptions,
): T[] {
  const query = options.searchQuery.trim().toLowerCase();
  const pinnedFirst = options.pinnedFirst ?? true;

  const filtered = query
    ? notes.filter((note) => {
        const titleMatch = note.title.toLowerCase().includes(query);
        const contentMatch = note.content.toLowerCase().includes(query);
        const tagMatch = note.tags.some((t) =>
          t.toLowerCase().includes(query.replace(/^#/, "")),
        );
        return titleMatch || contentMatch || tagMatch;
      })
    : [...notes];

  const dir = options.sortDirection === "asc" ? 1 : -1;

  filtered.sort((a, b) => {
    if (pinnedFirst && a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    if (options.sortBy === "title") {
      return a.title.localeCompare(b.title) * dir;
    }

    const aTime = Date.parse(a[options.sortBy]) || 0;
    const bTime = Date.parse(b[options.sortBy]) || 0;
    return (aTime - bTime) * dir;
  });

  return filtered;
}

export function formatRelativeDate(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const diffMs = Date.now() - time;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(time).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Strips common markdown syntax so note card excerpts read cleanly.
 */
export function stripMarkdown(content?: string | null): string {
  if (!content) return "";
  return content
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$1")
    .replace(/^[ \t]*>[ \t]?/gm, "")
    .replace(/^[ \t]*[-*+][ \t]+/gm, "")
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves the first displayable cover image URL for a note card.
 * Prefers server-supplied `coverImageUrl` (first media block image),
 * falling back to the first markdown image embedded in `note.content`.
 */
export function getNoteCoverImage(note: {
  coverImageUrl?: string | null;
  content?: string | null;
}): string | null {
  if (note.coverImageUrl) return note.coverImageUrl;
  if (!note.content) return null;
  const match = note.content.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);
  return match?.[1] ?? null;
}
