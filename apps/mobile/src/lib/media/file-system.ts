import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";

export type MediaCategory = "images" | "audio" | "files";

const MEDIA_BASE_DIR = `${FileSystem.documentDirectory}media/`;

const SUBDIRS: Record<MediaCategory, string> = {
  images: `${MEDIA_BASE_DIR}images/`,
  audio: `${MEDIA_BASE_DIR}audio/`,
  files: `${MEDIA_BASE_DIR}files/`,
};

let hasInitialized = false;

/**
 * Ensures permanent sandboxed directories exist under FileSystem.documentDirectory.
 */
export async function ensureMediaDirectories(): Promise<void> {
  if (hasInitialized) return;
  try {
    for (const dir of Object.values(SUBDIRS)) {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
    hasInitialized = true;
  } catch (err) {
    console.warn("[MediaFS] Failed to initialize media directories:", err);
  }
}

/**
 * Sanitizes an incoming filename to avoid path traversal or invalid characters.
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Extracts a file extension from a URI or filename.
 */
function extractExtension(uriOrName: string, fallback: string): string {
  const match = uriOrName.match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : fallback;
}

export interface SaveAssetResult {
  localUri: string;
  name: string;
  size?: number;
}

/**
 * Copies a temporary/cache asset into the permanent sandboxed app document directory.
 */
export async function saveAssetToSandbox(
  sourceUri: string,
  category: MediaCategory,
  preferredName?: string,
): Promise<SaveAssetResult> {
  await ensureMediaDirectories();

  const fallbackExt = category === "images" ? "jpg" : category === "audio" ? "m4a" : "bin";
  const ext = extractExtension(preferredName || sourceUri, fallbackExt);
  const fileId = Crypto.randomUUID();

  const originalName = preferredName
    ? sanitizeFilename(preferredName)
    : `${category.slice(0, -1)}_${fileId.slice(0, 8)}.${ext}`;

  const destFilename = `${fileId}.${ext}`;
  const destUri = `${SUBDIRS[category]}${destFilename}`;

  await FileSystem.copyAsync({
    from: sourceUri,
    to: destUri,
  });

  let size: number | undefined;
  try {
    const info = await FileSystem.getInfoAsync(destUri);
    if (info.exists && typeof info.size === "number") {
      size = info.size;
    }
  } catch {
    // Non-fatal if info cannot be read
  }

  return {
    localUri: destUri,
    name: originalName,
    size,
  };
}

/**
 * Deletes an asset from the sandbox if it resides within the app document directory.
 */
export async function deleteSandboxAsset(localUri?: string): Promise<void> {
  if (!localUri || !localUri.startsWith(FileSystem.documentDirectory ?? "")) {
    return;
  }
  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  } catch (err) {
    console.warn("[MediaFS] Failed to delete sandboxed asset:", localUri, err);
  }
}

/**
 * Formats byte size into human-readable metric (e.g. 540 KB, 2.4 MB).
 */
export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return "";
  }
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const unitIndex = Math.min(i, units.length - 1);
  const size = bytes / Math.pow(1024, unitIndex);
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
