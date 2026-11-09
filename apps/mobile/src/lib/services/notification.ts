import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import type { Reminder } from '@repo/types';

// Configure default notification handler for foreground display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldPresentAlert: true,
    shouldShowList: true,
  }),
});

export const NOTIFICATION_CHANNEL_ID = 'reminders';

/**
 * Ensures the Android notification channel is configured with high priority.
 */
export async function ensureReminderChannelAsync(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Note Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#004040',
      sound: 'default',
    });
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

  const triggerDate = new Date(reminder.dueAt);
  if (isNaN(triggerDate.getTime()) || triggerDate.getTime() <= Date.now()) {
    return null;
  }

  await ensureReminderChannelAsync();

  const identifier = `reminder-${reminder.id}`;

  try {
    // Cancel any existing notification with this identifier before rescheduling
    await Notifications.cancelScheduledNotificationAsync(identifier);

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: noteTitle?.trim() || 'Note Reminder',
        body: reminder.title?.trim() || 'You have a scheduled reminder for this note.',
        data: {
          noteId: reminder.noteId,
          reminderId: reminder.id,
        },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
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
