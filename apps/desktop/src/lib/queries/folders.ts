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

export async function createFolder(
  input: CreateFolderInput
): Promise<Folder | null> {
  const id = input.id ?? `folder-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const name = input.name.trim() || 'New Folder';
  const color = input.color ?? DEFAULT_FOLDER_COLOR;
  const icon = input.icon ?? 'folder';
  const isLocked = Boolean(input.isLocked);
  const pinCode = input.pinCode ?? null;
  const sortOrder = input.sortOrder ?? 0;

  try {
    await db.insert(folders).values({
      id,
      name,
      color,
      icon,
      isLocked,
      pinCode,
      sortOrder,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    const folder: Folder = {
      id,
      name,
      color,
      icon,
      isLocked,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    await enqueueOutbox('folders', id, 'upsert', {
      name,
      color,
      icon,
      isLocked,
      sortOrder,
      updatedAt: now,
    });

    return folder;
  } catch (err: unknown) {
    console.error('[Queries:createFolder:Error]', err);
    return null;
  }
}

export async function updateFolder(
  id: string,
  input: UpdateFolderInput
): Promise<boolean> {
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

    const changes: FolderChanges = {
      ...input,
      updatedAt: now,
    };

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
    // Unassign notes in this folder
    await db.update(notes).set({ folderId: null }).where(eq(notes.folderId, id));

    // Soft delete the folder
    await db.update(folders).set({ deletedAt: now }).where(eq(folders.id, id));

    // Enqueue outbox deletion
    await enqueueOutbox('folders', id, 'delete', { deletedAt: now });
    return true;
  } catch (err: unknown) {
    console.error('[Queries:deleteFolder:Error]', err);
    return false;
  }
}

export async function upsertFolderFromSync(f: Folder): Promise<void> {
  const [existing] = await db
    .select({ updatedAt: folders.updatedAt, version: folders.version })
    .from(folders)
    .where(eq(folders.id, f.id))
    .limit(1);

  if (existing && new Date(existing.updatedAt).getTime() > new Date(f.updatedAt).getTime()) {
    return;
  }

  await db
    .insert(folders)
    .values({
      id: f.id,
      name: f.name,
      color: f.color ?? DEFAULT_FOLDER_COLOR,
      icon: f.icon ?? 'folder',
      isLocked: Boolean(f.isLocked),
      pinCode: f.pinCode ?? null,
      sortOrder: f.sortOrder ?? 0,
      version: f.version ?? 1,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
      deletedAt: f.deletedAt ?? null,
    })
    .onConflictDoUpdate({
      target: folders.id,
      set: {
        name: f.name,
        color: f.color ?? DEFAULT_FOLDER_COLOR,
        icon: f.icon ?? 'folder',
        isLocked: Boolean(f.isLocked),
        pinCode: f.pinCode ?? null,
        sortOrder: f.sortOrder ?? 0,
        version: f.version ?? 1,
        updatedAt: f.updatedAt,
        deletedAt: f.deletedAt ?? null,
      },
    });
}
