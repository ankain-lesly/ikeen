import { Alert, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";

function showSettingsPrompt(title: string, message: string) {
  Alert.alert(
    title,
    message,
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          Linking.openSettings().catch(() => {});
        },
      },
    ],
    { cancelable: true },
  );
}

export async function ensureCameraPermission(): Promise<boolean> {
  try {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) return true;

    const requested = await ImagePicker.requestCameraPermissionsAsync();
    if (requested.granted) return true;

    if (!requested.canAskAgain) {
      showSettingsPrompt(
        "Camera Permission Required",
        "iKeen needs access to your camera to take photos and attach them to your notes. Please enable camera access in Settings.",
      );
    }
    return false;
  } catch (err) {
    console.warn("[Permissions] Failed to check/request camera permission:", err);
    return false;
  }
}

export async function ensureMediaLibraryPermission(): Promise<boolean> {
  try {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) return true;

    const requested = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (requested.granted) return true;

    if (!requested.canAskAgain) {
      showSettingsPrompt(
        "Photo Library Permission Required",
        "iKeen needs access to your photos to attach images to your notes. Please enable photo access in Settings.",
      );
    }
    return false;
  } catch (err) {
    console.warn(
      "[Permissions] Failed to check/request media library permission:",
      err,
    );
    return false;
  }
}

export async function ensureAudioRecordingPermission(): Promise<boolean> {
  try {
    const current = await getRecordingPermissionsAsync();
    if (current.granted) return true;

    const requested = await requestRecordingPermissionsAsync();
    if (requested.granted) return true;

    if (!requested.canAskAgain) {
      showSettingsPrompt(
        "Microphone Permission Required",
        "iKeen needs access to your microphone to record audio notes. Please enable microphone access in Settings.",
      );
    }
    return false;
  } catch (err) {
    console.warn(
      "[Permissions] Failed to check/request audio recording permission:",
      err,
    );
    return false;
  }
}
