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
  pinnedFirst?: boolean;
  tag?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'updatedAt' | 'createdAt' | 'title';
  orderDirection?: 'asc' | 'desc';
}
