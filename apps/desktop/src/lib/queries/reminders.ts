import { db, isTauriEnvironment } from '@/db/client';
import { reminders, type ReminderSelect } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import type { Reminder, CreateReminderInput, UpdateReminderInput } from '@repo/types';
import { enqueueOutbox } from '@/lib/sync/outbox';
import { newId, shouldApplySyncUpdate } from './query-utils';

function mapSelectToReminder(row: ReminderSelect): Reminder {
  return {
    id: row.id,
    userId: row.userId ?? null,
    noteId: row.noteId ?? null,
    title: row.title,
    dueAt: row.dueAt,
    repeat: row.repeat as Reminder['repeat'],
    isCompleted: Boolean(row.isCompleted),
    notificationId: row.notificationId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt ?? null,
  };
}

export async function scheduleDesktopNotification(title: string, body: string) {
  if (!isTauriEnvironment()) return;
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      '@tauri-apps/plugin-notification'
    );
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === 'granted';
    }
    if (granted) sendNotification({ title, body });
  } catch (err) {
    console.warn('[Reminders:NotificationError]', err);
  }
}

export async function getReminderForNote(noteId: string): Promise<Reminder | null> {
  try {
    const [row] = await db
      .select()
      .from(reminders)
      .where(and(eq(reminders.noteId, noteId), isNull(reminders.deletedAt)))
      .limit(1);
    return row ? mapSelectToReminder(row) : null;
  } catch (err: unknown) {
    console.error('[Queries:getReminderForNote:Error]', err);
    return null;
  }
}

export async function countActiveReminders(): Promise<number> {
  try {
    const rows = await db
      .select({ id: reminders.id })
      .from(reminders)
      .where(and(isNull(reminders.deletedAt), eq(reminders.isCompleted, false)));
    return rows.length;
  } catch (err: unknown) {
    console.error('[Queries:countActiveReminders:Error]', err);
    return 0;
  }
}

export async function listUpcomingReminders(): Promise<Reminder[]> {
  try {
    const rows = await db
      .select()
      .from(reminders)
      .where(and(isNull(reminders.deletedAt), eq(reminders.isCompleted, false)))
      .orderBy(asc(reminders.dueAt));
    return rows.map(mapSelectToReminder);
  } catch (err: unknown) {
    console.error('[Queries:listUpcomingReminders:Error]', err);
    return [];
  }
}

export async function createReminder(input: CreateReminderInput): Promise<Reminder | null> {
  const id = input.id ?? newId();
  const now = new Date().toISOString();
  const newReminder: Reminder = {
    id,
    userId: input.userId ?? null,
    noteId: input.noteId ?? null,
    title: input.title || 'Note Reminder',
    dueAt: input.dueAt,
    repeat: input.repeat ?? 'none',
    isCompleted: Boolean(input.isCompleted),
    notificationId: input.notificationId ?? null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  try {
    await db.insert(reminders).values(newReminder);
    await enqueueOutbox('reminders', id, 'upsert', {
      title: newReminder.title,
      dueAt: newReminder.dueAt,
      repeat: newReminder.repeat,
      isCompleted: newReminder.isCompleted,
      noteId: newReminder.noteId,
      updatedAt: now,
    });
    return newReminder;
  } catch (err: unknown) {
    console.error('[Queries:createReminder:Error]', err);
    return null;
  }
}

export async function updateReminder(
  id: string,
  input: UpdateReminderInput
): Promise<Reminder | null> {
  const now = new Date().toISOString();
  try {
    const updateValues: Partial<ReminderSelect> = { updatedAt: now };
    if (input.title !== undefined) updateValues.title = input.title;
    if (input.dueAt !== undefined) updateValues.dueAt = input.dueAt;
    if (input.repeat !== undefined) updateValues.repeat = input.repeat;
    if (input.isCompleted !== undefined) updateValues.isCompleted = input.isCompleted;
    if (input.deletedAt !== undefined) updateValues.deletedAt = input.deletedAt;

    await db.update(reminders).set(updateValues).where(eq(reminders.id, id));
    const [updatedRow] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
    if (!updatedRow) return null;

    await enqueueOutbox('reminders', id, 'upsert', { ...updateValues, updatedAt: now });
    return mapSelectToReminder(updatedRow);
  } catch (err: unknown) {
    console.error('[Queries:updateReminder:Error]', err);
    return null;
  }
}

export async function toggleReminderCompleted(id: string): Promise<Reminder | null> {
  try {
    const [existing] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
    if (!existing) return null;
    return await updateReminder(id, { isCompleted: !Boolean(existing.isCompleted) });
  } catch (err: unknown) {
    console.error('[Queries:toggleReminderCompleted:Error]', err);
    return null;
  }
}

export async function deleteReminder(id: string): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    await db.update(reminders).set({ deletedAt: now }).where(eq(reminders.id, id));
    await enqueueOutbox('reminders', id, 'delete', { deletedAt: now });
    return true;
  } catch (err: unknown) {
    console.error('[Queries:deleteReminder:Error]', err);
    return false;
  }
}

export async function upsertReminderFromSync(r: Reminder): Promise<void> {
  try {
    const [existing] = await db
      .select({ updatedAt: reminders.updatedAt })
      .from(reminders)
      .where(eq(reminders.id, r.id))
      .limit(1);

    if (!shouldApplySyncUpdate(existing?.updatedAt, r.updatedAt)) return;

    const setFields = {
      userId: r.userId ?? null,
      noteId: r.noteId ?? null,
      title: r.title ?? '',
      dueAt: r.dueAt,
      repeat: r.repeat ?? 'none',
      isCompleted: Boolean(r.isCompleted),
      notificationId: r.notificationId ?? null,
      updatedAt: r.updatedAt,
      deletedAt: r.deletedAt ?? null,
    };

    await db
      .insert(reminders)
      .values({ id: r.id, createdAt: r.createdAt, ...setFields })
      .onConflictDoUpdate({ target: reminders.id, set: setFields });
  } catch (err: unknown) {
    console.error('[Queries:upsertReminderFromSync:Error]', err);
  }
}
