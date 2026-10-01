import * as ExpoHaptics from 'expo-haptics';

import { useSettingsStore } from '@/lib/settings/settings-store';

function isEnabled() {
  return useSettingsStore.getState().hapticsEnabled !== false;
}

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export async function impactAsync(
  style: ExpoHaptics.ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle.Medium,
) {
  if (!isEnabled()) return;
  await ExpoHaptics.impactAsync(style);
}

export async function selectionAsync() {
  if (!isEnabled()) return;
  await ExpoHaptics.selectionAsync();
}

export async function notificationAsync(
  type: ExpoHaptics.NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType.Success,
) {
  if (!isEnabled()) return;
  await ExpoHaptics.notificationAsync(type);
}
