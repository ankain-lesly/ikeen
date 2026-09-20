export interface Folder {
  id: string;
  userId?: string | null;
  name: string;
  color: string;
  icon: string;
  isLocked: boolean;
  pinCode?: string | null;
  sortOrder: number;
  version?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FolderWithCount extends Folder {
  noteCount: number;
}

export type FolderChanges = Partial<
  Pick<
    Folder,
    | 'name'
    | 'color'
    | 'icon'
    | 'isLocked'
    | 'pinCode'
    | 'sortOrder'
    | 'deletedAt'
  >
>;

export type CreateFolderInput = Pick<Folder, 'name'> &
  Partial<
    Pick<
      Folder,
      'id' | 'userId' | 'color' | 'icon' | 'isLocked' | 'pinCode' | 'sortOrder'
    >
  >;

export type UpdateFolderInput = Partial<
  Pick<
    Folder,
    'name' | 'color' | 'icon' | 'isLocked' | 'pinCode' | 'sortOrder'
  >
>;

export interface ListFoldersOptions {
  search?: string;
  includeDeleted?: boolean;
  orderBy?: 'updatedAt' | 'createdAt' | 'name';
  orderDirection?: 'asc' | 'desc';
}
