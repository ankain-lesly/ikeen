import type { Folder, InsertFolder } from '../../db/schema';
import type {
  CreateFolderInput,
  UpdateFolderInput,
  ListFoldersOptions,
  FolderChanges,
} from '@repo/types';

export type {
  Folder,
  InsertFolder,
  CreateFolderInput,
  UpdateFolderInput,
  ListFoldersOptions,
  FolderChanges,
};

export interface FolderWithCount extends Folder {
  noteCount: number;
}

