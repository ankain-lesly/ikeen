import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { Reminder } from '@repo/types';

export const NOTIFICATION_CHANNEL_ID = 'reminders';
export const NOTIFICATION_SOUND = 'notification.wav';
export const REMINDER_CATEGORY_ID = 'reminder-actions';
export const ACTION_COMPLETE_REMINDER = 'COMPLETE_REMINDER';
export const ACTION_VIEW_NOTE = 'VIEW_NOTE';

// Configure default notification handler for foreground display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldPresentAlert: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

/**
 * Configures interactive notification action buttons ("Mark Done" and "View Note").
 */
export async function ensureReminderCategoryAsync(): Promise<void> {
  try {
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY_ID, [
      {
        identifier: ACTION_COMPLETE_REMINDER,
        buttonTitle: 'Mark Done',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: ACTION_VIEW_NOTE,
        buttonTitle: 'View Note',
        options: {
          opensAppToForeground: true,
        },
      },
    ]);
  } catch (err) {
    console.warn('[ReminderService] Failed to set reminder category:', err);
  }
}

/**
 * Ensures the Android notification channel is configured with high priority and custom sound.
 */
export async function ensureReminderChannelAsync(): Promise<void> {
  await ensureReminderCategoryAsync();
  if (Platform.OS === 'android') {
    try {
      const existing = await Notifications.getNotificationChannelAsync(NOTIFICATION_CHANNEL_ID);
      if (existing && existing.sound !== 'custom') {
        await Notifications.deleteNotificationChannelAsync(NOTIFICATION_CHANNEL_ID);
      }
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Note Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: NOTIFICATION_SOUND,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#004040',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    } catch (err) {
      console.warn('[ReminderService] Failed to set reminder channel:', err);
    }
  }
}

/**
 * Checks current notification permission status without prompting.
 */
export async function getNotificationPermissionsAsync(): Promise<{
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}> {
  const settings = await Notifications.getPermissionsAsync();
  return {
    granted: settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
    canAskAgain: settings.canAskAgain,
    status: settings.status,
  };
}

/**
 * Prompts user for notification permissions.
 */
export async function requestNotificationPermissionsAsync(): Promise<boolean> {
  await ensureReminderChannelAsync();
  const settings = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return Boolean(
    settings.granted ||
    settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

/**
 * Directs the user to the native device application settings.
 */
export async function openDeviceNotificationSettings(): Promise<void> {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    await Linking.openSettings();
  }
}

/**
 * Schedules a local notification for an uncompleted reminder.
 */
export async function scheduleReminderNotification(
  reminder: Reminder,
  noteTitle?: string
): Promise<string | null> {
  if (reminder.isCompleted || !!reminder.deletedAt) {
    await cancelReminderNotification(reminder.id);
    return null;
  }

  const rawTriggerDate = new Date(reminder.dueAt);
  if (isNaN(rawTriggerDate.getTime())) {
    return null;
  }

  const now = Date.now();
  let triggerDate = rawTriggerDate;

  // If reminder is scheduled within the current minute or slightly in the past (e.g. user just hit save)
  // give it a 2-second future trigger so the alert reliably fires
  if (triggerDate.getTime() <= now) {
    if (now - triggerDate.getTime() <= 60_000) {
      triggerDate = new Date(now + 2000);
    } else {
      return null;
    }
  }

  // Ensure notification permissions are requested and granted
  const permissions = await getNotificationPermissionsAsync();
  if (!permissions.granted) {
    const granted = await requestNotificationPermissionsAsync();
    if (!granted) {
      console.warn('[ReminderService] Notification permissions not granted');
      return null;
    }
  }

  await ensureReminderChannelAsync();

  try {
    // Always cancel existing notifications for this reminder before rescheduling
    await cancelReminderNotification(reminder.id);

    // =========================================================================
    // Interval Batch Pre-Scheduling (Approach A)
    // =========================================================================
    if (
      reminder.repeat === 'interval' &&
      reminder.repeatInterval &&
      reminder.repeatInterval >= 60
    ) {
      const maxRepeats = Math.min(100, Math.max(1, reminder.maxRepeats ?? 10));
      const currentCount = reminder.repeatCount ?? 0;
      const remainingRepeats = Math.max(0, maxRepeats - currentCount);

      if (remainingRepeats <= 0) {
        return null; // Sequence exhausted, do not schedule
      }

      // Pre-schedule safe batch of discrete 1-shot DATE triggers (capped to 15)
      const batchSize = Math.min(remainingRepeats, 15);
      const intervalMs = reminder.repeatInterval * 1000;
      let baseTime = triggerDate.getTime();
      if (baseTime <= now) {
        baseTime = now + 2000;
      }

      for (let i = 0; i < batchSize; i++) {
        const occurrenceTime = baseTime + (i * intervalMs);
        const occurrenceNumber = currentCount + i + 1;
        const batchIdentifier = `reminder-${reminder.id}-${i}`;

        await Notifications.scheduleNotificationAsync({
          identifier: batchIdentifier,
          content: {
            title: noteTitle?.trim() || 'Note Reminder',
            body: `${reminder.title?.trim() || 'Scheduled interval reminder'} (${occurrenceNumber}/${maxRepeats})`,
            data: {
              noteId: reminder.noteId,
              reminderId: reminder.id,
              occurrenceIndex: occurrenceNumber,
              totalOccurrences: maxRepeats,
            },
            categoryIdentifier: REMINDER_CATEGORY_ID,
            sound: NOTIFICATION_SOUND,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(occurrenceTime),
            channelId: NOTIFICATION_CHANNEL_ID,
          },
        });
      }

      return `reminder-${reminder.id}-0`;
    }

    // =========================================================================
    // Regular Calendar Triggers (Daily, Weekly, Monthly, Yearly, 1-shot Date)
    // =========================================================================
    const identifier = `reminder-${reminder.id}`;
    let trigger: Notifications.NotificationTriggerInput;

    if (reminder.repeat === 'daily') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: rawTriggerDate.getHours(),
        minute: rawTriggerDate.getMinutes(),
        channelId: NOTIFICATION_CHANNEL_ID,
      };
    } else if (reminder.repeat === 'weekly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: rawTriggerDate.getDay() + 1, // 1 is Sunday, 2 is Monday ... 7 is Saturday
        hour: rawTriggerDate.getHours(),
        minute: rawTriggerDate.getMinutes(),
        channelId: NOTIFICATION_CHANNEL_ID,
      };
    } else if (reminder.repeat === 'monthly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: rawTriggerDate.getDate(),
        hour: rawTriggerDate.getHours(),
        minute: rawTriggerDate.getMinutes(),
        channelId: NOTIFICATION_CHANNEL_ID,
      };
    } else if (reminder.repeat === 'yearly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        day: rawTriggerDate.getDate(),
        month: rawTriggerDate.getMonth(), // 0-indexed month
        hour: rawTriggerDate.getHours(),
        minute: rawTriggerDate.getMinutes(),
        channelId: NOTIFICATION_CHANNEL_ID,
      };
    } else {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: NOTIFICATION_CHANNEL_ID,
      };
    }

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: noteTitle?.trim() || 'Note Reminder',
        body: reminder.title?.trim() || 'You have a scheduled reminder for this note.',
        data: {
          noteId: reminder.noteId,
          reminderId: reminder.id,
        },
        categoryIdentifier: REMINDER_CATEGORY_ID,
        sound: NOTIFICATION_SOUND,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });

    return identifier;
  } catch (err) {
    console.warn('[ReminderService] Failed to schedule notification:', err);
    return null;
  }
}

/**
 * Cancels a scheduled notification for a reminder (including any batch occurrences).
 */
export async function cancelReminderNotification(reminderId: string): Promise<void> {
  try {
    const prefix = `reminder-${reminderId}`;
    await Notifications.cancelScheduledNotificationAsync(prefix);

    // Cancel all batch-scheduled occurrences matching this prefix
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.identifier.startsWith(prefix)) {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (err) {
    console.warn('[ReminderService] Failed to cancel notification:', err);
  }
}

/**
 * Reconciles active, pending reminders with OS scheduled notifications.
 */
export async function reconcileScheduledNotifications(
  activeReminders: Reminder[],
  noteTitlesMap: Map<string, string>
): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((n) => n.identifier));

    for (const reminder of activeReminders) {
      if (reminder.isCompleted || !!reminder.deletedAt) continue;

      const triggerDate = new Date(reminder.dueAt);
      if (triggerDate.getTime() <= Date.now() && reminder.repeat !== 'interval') continue;

      const expectedId = reminder.repeat === 'interval'
        ? `reminder-${reminder.id}-0`
        : `reminder-${reminder.id}`;

      if (!scheduledIds.has(expectedId)) {
        const title = reminder.noteId ? noteTitlesMap.get(reminder.noteId) : undefined;
        await scheduleReminderNotification(reminder, title);
      }
    }
  } catch (err) {
    console.warn('[ReminderService] Reconciliation failed:', err);
  }
}
