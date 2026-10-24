import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import type { MediaItem } from "@/lib/types/notes";
import {
  ensureCameraPermission,
  ensureMediaLibraryPermission,
} from "./permissions";
import { saveAssetToSandbox } from "./file-system";

export interface PickImagesOptions {
  allowsMultiple?: boolean;
}

/**
 * Opens system photo gallery and persists selected images into the sandboxed storage.
 */
export async function pickImagesFromLibrary(
  options: PickImagesOptions = {},
): Promise<MediaItem[]> {
  const hasPermission = await ensureMediaLibraryPermission();
  if (!hasPermission) return [];

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: options.allowsMultiple ?? true,
      quality: 0.85,
      orderedSelection: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const items: MediaItem[] = [];

    for (const asset of result.assets) {
      const saved = await saveAssetToSandbox(
        asset.uri,
        "images",
        asset.fileName ?? undefined,
      );

      items.push({
        id: Crypto.randomUUID(),
        mediaType: "image",
        localUri: saved.localUri,
        name: saved.name,
        metadata: {
          width: asset.width,
          height: asset.height,
        },
      });
    }

    return items;
  } catch (err) {
    console.warn("[MediaPickers] Failed to pick images from library:", err);
    return [];
  }
}

/**
 * Launches camera to capture a new photo and persists it into sandboxed storage.
 */
export async function takePhotoWithCamera(): Promise<MediaItem | null> {
  const hasPermission = await ensureCameraPermission();
  if (!hasPermission) return null;

  try {
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset) return null;

    const saved = await saveAssetToSandbox(
      asset.uri,
      "images",
      asset.fileName ?? `photo_${Date.now()}.jpg`,
    );

    return {
      id: Crypto.randomUUID(),
      mediaType: "image",
      localUri: saved.localUri,
      name: saved.name,
      metadata: {
        width: asset.width,
        height: asset.height,
      },
    };
  } catch (err) {
    console.warn("[MediaPickers] Failed to capture photo with camera:", err);
    return null;
  }
}

/**
 * Opens system document picker and persists selected files into sandboxed storage.
 */
export async function pickDocumentFile(): Promise<MediaItem[]> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return [];
    }

    const items: MediaItem[] = [];

    for (const asset of result.assets) {
      const saved = await saveAssetToSandbox(asset.uri, "files", asset.name);

      items.push({
        id: Crypto.randomUUID(),
        mediaType: "file",
        localUri: saved.localUri,
        name: saved.name,
        metadata: {
          size: asset.size ?? saved.size,
          mimeType: asset.mimeType ?? undefined,
        },
      });
    }

    return items;
  } catch (err) {
    console.warn("[MediaPickers] Failed to pick documents:", err);
    return [];
  }
}
