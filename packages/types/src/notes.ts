export interface Note {
  id: string;
  title: string;
  folderId?: string | null;
  userId?: string | null;
  content: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  summary?: string | null;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type NoteChanges = Partial<Note>;

export type CreateNoteInput = Partial<
  Pick<
    Note,
    | "id"
    | "userId"
    | "folderId"
    | "title"
    | "content"
    | "tags"
    | "isPinned"
    | "isArchived"
    | "summary"
  >
>;

export type UpdateNoteInput = Partial<
  Pick<
    Note,
    | "folderId"
    | "title"
    | "content"
    | "tags"
    | "isPinned"
    | "isArchived"
    | "summary"
  >
>;

export interface ListNotesOptions {
  folderId?: string | null;
  includeArchived?: boolean;
  includeDeleted?: boolean;
  /** Header/view: list only pinned notes. Independent of `pinnedFirst` sort. */
  pinnedOnly?: boolean;
  /** Header/view: list only archived notes. `includeArchived` alone still mixes. */
  archivedOnly?: boolean;
  /** Sort: keep pinned notes above others (Recent view). Default true. */
  pinnedFirst?: boolean;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: "updatedAt" | "createdAt" | "title";
  orderDirection?: "asc" | "desc";
  /** Whether to populate note.blocks. Default true in mobile queries. */
  withBlocks?: boolean;
}

/** True when tag / custom sort / pinnedFirst=false are set. Ignores header view keys. */
export function hasActiveNotesFilters(filter: ListNotesOptions): boolean {
  if (filter.tag) return true;
  if (filter.orderBy != null && filter.orderBy !== "updatedAt") return true;
  if (filter.orderDirection === "asc") return true;
  return filter.pinnedFirst === false;
}

// ============================================================================
// Block Domain Types
// ============================================================================

export type BlockType = "text" | "list" | "media";
export type ListType = "checkbox" | "bullet" | "ordered";

export interface ListItem {
  id: string;
  content: string;
  checked?: boolean;
}

export type MediaType = "image" | "audio" | "file";

export interface ImageMetadata {
  width?: number;
  height?: number;
}

export interface AudioMetadata {
  duration?: number;
  sampleRate?: number;
  bitrate?: number;
}

export interface FileMetadata {
  size?: number;
  mimeType?: string;
}

export type MediaMetadata =
  | ImageMetadata
  | AudioMetadata
  | FileMetadata
  | Record<string, unknown>;

export interface MediaItem {
  id: string;
  mediaType: MediaType;
  localUri: string;
  name?: string;
  url?: string;
  caption?: string;
  metadata?: MediaMetadata;
}

export interface BaseBlock {
  id: string;
  noteId: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TextBlock extends BaseBlock {
  type: "text";
  content: string; // Markdown string
}

export interface ListBlock extends BaseBlock {
  type: "list";
  listType: ListType;
  header?: string;
  footer?: string;
  content: ListItem[];
}

export interface MediaBlock extends BaseBlock {
  type: "media";
  content: MediaItem[];
}

export type NoteBlock = TextBlock | ListBlock | MediaBlock;

export type CreateBlockInput = {
  id?: string;
  type: BlockType;
  position?: number;
  listType?: ListType;
  header?: string;
  footer?: string;
  content?: string | ListItem[] | MediaItem[];
};

export type UpdateBlockInput = Partial<{
  type: BlockType;
  position: number;
  listType: ListType;
  header: string | null;
  footer: string | null;
  content: string | ListItem[] | MediaItem[];
}>;
