import type { FolderSelect, InsertFolder } from '../../db/schema';
import type {
  CreateFolderInput,
  UpdateFolderInput,
  ListFoldersOptions,
  FolderChanges,
} from '@repo/types';

export type {
  FolderSelect,
  InsertFolder,
  CreateFolderInput,
  UpdateFolderInput,
  ListFoldersOptions,
  FolderChanges,
};

export interface FolderWithCount extends FolderSelect {
  noteCount: number;
}

