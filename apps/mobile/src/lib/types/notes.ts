import type { Note, InsertNote } from '../../db/schema';

export type { Note, InsertNote };

export interface CreateNoteInput {
  id?: string;
  folderId?: string | null;
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  summary?: string;
}

export interface UpdateNoteInput {
  folderId?: string | null;
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  summary?: string | null;
}

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
