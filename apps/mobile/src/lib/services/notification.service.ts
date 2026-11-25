import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { Reminder } from '@repo/types';

export const NOTIFICATION_CHANNEL_ID = 'reminders';
export const NOTIFICATION_SOUND = 'notification.wav';

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
 * Ensures the Android notification channel is configured with high priority and custom sound.
 */
export async function ensureReminderChannelAsync(): Promise<void> {
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

  const identifier = `reminder-${reminder.id}`;

  try {
    // Cancel any existing notification with this identifier before rescheduling
    await Notifications.cancelScheduledNotificationAsync(identifier);

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
 * Cancels a scheduled notification for a reminder.
 */
export async function cancelReminderNotification(reminderId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`reminder-${reminderId}`);
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
      if (triggerDate.getTime() <= Date.now()) continue;

      const expectedId = `reminder-${reminder.id}`;
      if (!scheduledIds.has(expectedId)) {
        const title = reminder.noteId ? noteTitlesMap.get(reminder.noteId) : undefined;
        await scheduleReminderNotification(reminder, title);
      }
    }
  } catch (err) {
    console.warn('[ReminderService] Reconciliation failed:', err);
  }
}
