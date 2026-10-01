export interface Note {
  id: string;
  userId?: string | null;
  folderId?: string | null;
  title: string;
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
    | 'id'
    | 'userId'
    | 'folderId'
    | 'title'
    | 'content'
    | 'tags'
    | 'isPinned'
    | 'isArchived'
    | 'summary'
  >
>;

export type UpdateNoteInput = Partial<
  Pick<
    Note,
    | 'folderId'
    | 'title'
    | 'content'
    | 'tags'
    | 'isPinned'
    | 'isArchived'
    | 'summary'
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
  orderBy?: 'updatedAt' | 'createdAt' | 'title';
  orderDirection?: 'asc' | 'desc';
}

/** True when tag / custom sort / pinnedFirst=false are set. Ignores header view keys. */
export function hasActiveNotesFilters(filter: ListNotesOptions): boolean {
  if (filter.tag) return true;
  if (filter.orderBy != null && filter.orderBy !== 'updatedAt') return true;
  if (filter.orderDirection === 'asc') return true;
  return filter.pinnedFirst === false;
}
