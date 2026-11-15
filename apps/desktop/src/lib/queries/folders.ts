import { db } from '@/db/client';
import { folders, notes } from '@/db/schema';
import { eq, isNull, and, asc } from 'drizzle-orm';
import type {
  Folder,
  FolderChanges,
  CreateFolderInput,
  UpdateFolderInput,
} from '@repo/types';
import { DEFAULT_FOLDER_COLOR } from '@repo/utils/constants';
import { enqueueOutbox } from '@/lib/sync/outbox';
import { newId, shouldApplySyncUpdate } from './query-utils';

export async function listFolders(): Promise<Folder[]> {
  try {
    const rows = await db
      .select()
      .from(folders)
      .where(isNull(folders.deletedAt))
      .orderBy(asc(folders.sortOrder), asc(folders.name));

    return rows.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      icon: f.icon,
      isLocked: f.isLocked,
      sortOrder: f.sortOrder,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));
  } catch (err: unknown) {
    console.error('[Queries:listFolders:Error]', err);
    return [];
  }
}

export async function createFolder(input: CreateFolderInput): Promise<Folder | null> {
  const id = input.id ?? newId();
  const now = new Date().toISOString();
  const folder: Folder = {
    id,
    name: input.name.trim() || 'New Folder',
    color: input.color ?? DEFAULT_FOLDER_COLOR,
    icon: input.icon ?? 'folder',
    isLocked: Boolean(input.isLocked),
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await db.insert(folders).values({
      ...folder,
      pinCode: input.pinCode ?? null,
      version: 1,
    });

    await enqueueOutbox('folders', id, 'upsert', {
      name: folder.name,
      color: folder.color,
      icon: folder.icon,
      isLocked: folder.isLocked,
      sortOrder: folder.sortOrder,
      updatedAt: now,
    });

    return folder;
  } catch (err: unknown) {
    console.error('[Queries:createFolder:Error]', err);
    return null;
  }
}

export async function updateFolder(id: string, input: UpdateFolderInput): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const updateValues: Record<string, any> = { updatedAt: now };
    if (input.name !== undefined) updateValues.name = input.name.trim();
    if (input.color !== undefined) updateValues.color = input.color;
    if (input.icon !== undefined) updateValues.icon = input.icon;
    if (input.sortOrder !== undefined) updateValues.sortOrder = input.sortOrder;
    if (input.isLocked !== undefined) updateValues.isLocked = input.isLocked;
    if (input.pinCode !== undefined) updateValues.pinCode = input.pinCode;

    await db
      .update(folders)
      .set(updateValues)
      .where(and(eq(folders.id, id), isNull(folders.deletedAt)));

    const changes: FolderChanges = { ...input, updatedAt: now };
    await enqueueOutbox('folders', id, 'upsert', changes);
    return true;
  } catch (err: unknown) {
    console.error('[Queries:updateFolder:Error]', err);
    return false;
  }
}

export async function deleteFolder(id: string): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    await db.update(notes).set({ folderId: null }).where(eq(notes.folderId, id));
    await db.update(folders).set({ deletedAt: now }).where(eq(folders.id, id));
    await enqueueOutbox('folders', id, 'delete', { deletedAt: now });
    return true;
  } catch (err: unknown) {
    console.error('[Queries:deleteFolder:Error]', err);
    return false;
  }
}

export async function upsertFolderFromSync(f: Folder): Promise<void> {
  const [existing] = await db
    .select({ updatedAt: folders.updatedAt })
    .from(folders)
    .where(eq(folders.id, f.id))
    .limit(1);

  if (!shouldApplySyncUpdate(existing?.updatedAt, f.updatedAt)) return;

  const setFields = {
    name: f.name,
    color: f.color ?? DEFAULT_FOLDER_COLOR,
    icon: f.icon ?? 'folder',
    isLocked: Boolean(f.isLocked),
    pinCode: f.pinCode ?? null,
    sortOrder: f.sortOrder ?? 0,
    version: f.version ?? 1,
    updatedAt: f.updatedAt,
    deletedAt: f.deletedAt ?? null,
  };

  await db
    .insert(folders)
    .values({ id: f.id, createdAt: f.createdAt, ...setFields })
    .onConflictDoUpdate({ target: folders.id, set: setFields });
}
