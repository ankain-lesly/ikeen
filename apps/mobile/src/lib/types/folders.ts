import type { Folder, InsertFolder } from '../../db/schema';

export type { Folder, InsertFolder };

export interface FolderWithCount extends Folder {
  noteCount: number;
}

export interface CreateFolderInput {
  id?: string;
  name: string;
  color?: string;
  icon?: string;
  isLocked?: boolean;
  pinCode?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  color?: string;
  icon?: string;
  isLocked?: boolean;
  pinCode?: string | null;
  sortOrder?: number;
}

export interface ListFoldersOptions {
  search?: string;
  includeDeleted?: boolean;
  orderBy?: 'updatedAt' | 'createdAt' | 'name';
  orderDirection?: 'asc' | 'desc';
}
