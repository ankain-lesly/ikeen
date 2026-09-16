import type { Note, InsertNote } from '../../db/schema';

export type { Note, InsertNote };

export interface CreateNoteInput {
  id?: string;
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  summary?: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  summary?: string | null;
}

export interface ListNotesOptions {
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
