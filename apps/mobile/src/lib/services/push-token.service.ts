import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient, request } from "../api/api-client";
import { useAuthStore } from "../auth/auth-store";
import { requestNotificationPermissionsAsync } from "./notification.service";

const STORAGE_KEY_REGISTERED_PUSH_TOKEN = "@ikeen_registered_push_token";

/**
 * Registers the device's Expo push token with the backend API.
 * Supports multiple push tokens per device and multiple devices per user.
 */
export async function registerPushTokenWithServerAsync(
  explicitToken?: string | null,
): Promise<string | null> {
  if (Platform.OS === "web") {
    return null;
  }

  // Push notifications require a physical device on iOS/Android
  if (!Device.isDevice) {
    console.log(
      "[PushToken] Skipping push registration: simulator or virtual device detected.",
    );
    return null;
  }

  const authToken = explicitToken ?? useAuthStore.getState().token;
  if (!authToken) {
    console.log(
      "[PushToken] User not authenticated; skipping push token registration.",
    );
    return null;
  }

  // Ensure notification permissions are granted
  const hasPermission = await requestNotificationPermissionsAsync();
  if (!hasPermission) {
    console.log("[PushToken] Notification permissions not granted.");
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;

    if (!token) {
      console.warn("[PushToken] Failed to obtain Expo push token.");
      return null;
    }

    const cachedToken = await AsyncStorage.getItem(
      STORAGE_KEY_REGISTERED_PUSH_TOKEN,
    );
    const platform = Platform.OS === "ios" ? "ios" : "android";

    // Device metadata
    const payload = {
      token,
      platform,
      deviceId:
        Device.osInternalBuildId ||
        Device.modelId ||
        Device.deviceName ||
        undefined,
      deviceName: Device.deviceName || undefined,
      osVersion: Device.osVersion || undefined,
      appVersion: Constants.expoConfig?.version || undefined,
      manufacturer: Device.manufacturer || undefined,
      model: Device.modelName || undefined,
    };

    // If already registered identical token in this app session, skip redundant network call
    if (cachedToken === token) {
      console.warn("[PushToken] Token already set.", token);
      return token;
    }

    await apiClient.post("/notifications/push-token", payload, {
      token: authToken,
    });
    await AsyncStorage.setItem(STORAGE_KEY_REGISTERED_PUSH_TOKEN, token);

    console.log(
      "[PushToken] Successfully registered Expo push token with server.",
    );
    return token;
  } catch (error) {
    console.warn(
      "[PushToken] Failed to register push token with server:",
      error,
    );
    return null;
  }
}

/**
 * Deregisters the cached Expo push token from the backend API.
 */
export async function deregisterPushTokenWithServerAsync(
  explicitToken?: string | null,
): Promise<void> {
  const cachedToken = await AsyncStorage.getItem(
    STORAGE_KEY_REGISTERED_PUSH_TOKEN,
  );
  if (!cachedToken) return;

  const authToken = explicitToken ?? useAuthStore.getState().token;
  if (authToken) {
    try {
      await request("/notifications/push-token", {
        method: "DELETE",
        body: JSON.stringify({ token: cachedToken }),
        token: authToken,
      });
      console.log(
        "[PushToken] Successfully deregistered push token from server.",
      );
    } catch (err) {
      console.warn(
        "[PushToken] Failed to deregister push token from server:",
        err,
      );
    }
  }

  await AsyncStorage.removeItem(STORAGE_KEY_REGISTERED_PUSH_TOKEN);
}

/**
 * Initializes automatic registration on login and deregistration on logout.
 * Subscribes to auth-store state transitions to decouple auth from push services.
 */
export function initPushTokenAuthListener(): () => void {
  return useAuthStore.subscribe((state, prevState) => {
    // Transitioned from unauthenticated -> authenticated: register token
    if (!prevState.isAuthenticated && state.isAuthenticated && state.token) {
      registerPushTokenWithServerAsync(state.token).catch((err) => {
        console.warn("[PushToken] Auto-registration failed:", err);
      });
    }

    // Transitioned from authenticated -> unauthenticated: deregister token
    if (prevState.isAuthenticated && !state.isAuthenticated) {
      deregisterPushTokenWithServerAsync(prevState.token).catch((err) => {
        console.warn("[PushToken] Auto-deregistration failed:", err);
      });
    }
  });
}
