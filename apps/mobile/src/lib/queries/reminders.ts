import { useMemo } from 'react';
import * as Crypto from 'expo-crypto';
import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/db/client';
import { reminders, notes } from '@/db/schema';
import type {
  Reminder,
  CreateReminderInput,
  UpdateReminderInput,
} from '@/lib/types/reminders';
import { enqueueOutbox } from '@/lib/sync/outbox';
import { currentAuthUserId, ownerCondition } from './owner';
import {
  scheduleReminderNotification,
  cancelReminderNotification,
} from '@/lib/services/notification';

// ============================================================================
// Live Queries
// ============================================================================

/**
 * Live reactive hook returning non-deleted reminders for a specific note.
 */
export function useLiveRemindersForNote(noteId: string | null | undefined) {
  const query = db
    .select()
    .from(reminders)
    .where(
      and(
        noteId ? eq(reminders.noteId, noteId) : sql`1 = 0`,
        isNull(reminders.deletedAt)
      )
    )
    .orderBy(asc(reminders.dueAt));

  return useLiveQuery(query, [noteId ?? '']);
}

/**
 * Live hook returning upcoming uncompleted reminders across all notes.
 */
export function useLiveUpcomingReminders(limit = 20) {
  const userId = currentAuthUserId();

  const query = useMemo(() => {
    const now = new Date().toISOString();
    const conditions: SQL[] = [
      ownerCondition(reminders.userId, userId),
      isNull(reminders.deletedAt),
      eq(reminders.isCompleted, false),
      sql`${reminders.dueAt} >= ${now}`,
    ];

    return db
      .select({
        reminder: reminders,
        noteTitle: notes.title,
      })
      .from(reminders)
      .leftJoin(notes, eq(reminders.noteId, notes.id))
      .where(and(...conditions))
      .orderBy(asc(reminders.dueAt))
      .limit(limit);
  }, [userId, limit]);

  return useLiveQuery(query, [userId, limit]);
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Creates a single reminder for a note.
 */
export async function createReminder(
  input: CreateReminderInput,
  userId: string | null = currentAuthUserId()
): Promise<Reminder> {
  const now = new Date().toISOString();
  const id = input.id ?? Crypto.randomUUID();

  const newReminder: Reminder = {
    id,
    userId,
    noteId: input.noteId ?? null,
    title: input.title ?? '',
    dueAt: input.dueAt,
    repeat: input.repeat ?? 'none',
    isCompleted: input.isCompleted ?? false,
    notificationId: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  await db.insert(reminders).values(newReminder);

  // Retrieve note title for notification content
  let noteTitle = '';
  if (newReminder.noteId) {
    const [note] = await db
      .select({ title: notes.title })
      .from(notes)
      .where(eq(notes.id, newReminder.noteId))
      .limit(1);
    noteTitle = note?.title ?? '';
  }

  // Schedule native OS notification
  const notificationId = await scheduleReminderNotification(newReminder, noteTitle);
  if (notificationId) {
    newReminder.notificationId = notificationId;
    await db
      .update(reminders)
      .set({ notificationId })
      .where(eq(reminders.id, id));
  }

  // Enqueue outbox mutation for sync
  await enqueueOutbox('reminders', id, 'upsert', newReminder);

  return newReminder;
}

/**
 * Batch creates reminders across multiple selected notes.
 */
export async function batchCreateReminders(
  noteIds: string[],
  input: Omit<CreateReminderInput, 'noteId'>,
  userId: string | null = currentAuthUserId()
): Promise<Reminder[]> {
  const createdList: Reminder[] = [];

  for (const noteId of noteIds) {
    const reminder = await createReminder(
      {
        ...input,
        noteId,
      },
      userId
    );
    createdList.push(reminder);
  }

  return createdList;
}

/**
 * Updates an existing reminder.
 */
export async function updateReminder(
  id: string,
  input: UpdateReminderInput
): Promise<Reminder | null> {
  const now = new Date().toISOString();

  const [existing] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, id))
    .limit(1);

  if (!existing) return null;

  const updatedFields = {
    ...input,
    updatedAt: now,
  };

  await db
    .update(reminders)
    .set(updatedFields)
    .where(eq(reminders.id, id));

  const [updated] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, id))
    .limit(1);

  if (updated) {
    // Reschedule or cancel notification based on updated state
    let noteTitle = '';
    if (updated.noteId) {
      const [note] = await db
        .select({ title: notes.title })
        .from(notes)
        .where(eq(notes.id, updated.noteId))
        .limit(1);
      noteTitle = note?.title ?? '';
    }

    if (updated.isCompleted || updated.deletedAt) {
      await cancelReminderNotification(id);
    } else {
      await scheduleReminderNotification(updated as Reminder, noteTitle);
    }

    await enqueueOutbox('reminders', id, 'upsert', updatedFields);
  }

  return (updated as Reminder) ?? null;
}

/**
 * Toggles a reminder's completion state.
 */
export async function toggleReminderCompleted(id: string): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, id))
    .limit(1);

  if (!existing) return false;

  const nextCompleted = !existing.isCompleted;
  await updateReminder(id, { isCompleted: nextCompleted });
  return nextCompleted;
}

/**
 * Soft deletes a reminder and clears its OS notification.
 */
export async function deleteReminder(id: string): Promise<void> {
  const now = new Date().toISOString();

  await db
    .update(reminders)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(reminders.id, id));

  await cancelReminderNotification(id);
  await enqueueOutbox('reminders', id, 'delete', { deletedAt: now });
}

/**
 * Upserts a reminder pulled from sync.
 */
export async function upsertReminderFromSync(r: Reminder): Promise<void> {
  const [existing] = await db
    .select()
    .from(reminders)
    .where(eq(reminders.id, r.id))
    .limit(1);

  if (existing) {
    const localUpdatedAt = new Date(existing.updatedAt).getTime();
    const incomingUpdatedAt = new Date(r.updatedAt).getTime();

    if (incomingUpdatedAt >= localUpdatedAt) {
      await db.update(reminders).set(r).where(eq(reminders.id, r.id));
    }
  } else {
    await db.insert(reminders).values(r);
  }

  if (r.isCompleted || r.deletedAt) {
    await cancelReminderNotification(r.id);
  } else {
    // Schedule incoming reminder if future
    let noteTitle = '';
    if (r.noteId) {
      const [note] = await db
        .select({ title: notes.title })
        .from(notes)
        .where(eq(notes.id, r.noteId))
        .limit(1);
      noteTitle = note?.title ?? '';
    }
    await scheduleReminderNotification(r, noteTitle);
  }
}
