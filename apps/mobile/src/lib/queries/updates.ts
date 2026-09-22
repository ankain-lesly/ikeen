import { log } from "@repo/utils";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { AppUpdateInfo } from "@repo/types";
import { API_BASE_URL } from "../api/api-client";

export type { AppUpdateInfo };

// ===========================================
// CHECK APP UPDATES
// ===========================================

const UPDATE_URL = `${API_BASE_URL}/sync/updates`;

// ─── Version compare ─────────────────────────────────────────────────────────
export function isNewerVersion(apiVersion: string, currentVersion: string) {
  const a = apiVersion.split(".").map(Number);
  const b = currentVersion.split(".").map(Number);

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }

  return false;
}

// ─── Fetch update ────────────────────────────────────────────────────────────
export async function checkForUpdates(): Promise<AppUpdateInfo | null> {
  try {
    log("Checking for updates...");

    const version = Constants.expoConfig?.version || "0.0.0";
    const build =
      Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode;

    log({ currentVersion: version, currentBuild: build });

    const queryParams = new URLSearchParams();
    if (Platform.OS) queryParams.set("platform", Platform.OS);
    if (version) queryParams.set("currentVersion", version);
    if (build) queryParams.set("currentBuild", String(build));

    const url = `${UPDATE_URL}?${queryParams.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      log("Update check response not ok:", res.status);
      return null;
    }
    const data: AppUpdateInfo = await res.json();

    // const data: AppUpdateInfo = {
    //   version: "1.1.0",
    //   mandatory: false,
    //   title: "New Update Available 🚀",
    //   description: "• Improved performance\n• New sounds\n• Bug fixes",
    //   url: "https://your-download-link.com/app.apk",
    // };

    if (isNewerVersion(data.version, version)) {
      return data;
    }

    // log("UPDATES RESULT:", data);
    return null;
  } catch (error) {
    log("Update check failed:", error);
    return null;
  }
}
