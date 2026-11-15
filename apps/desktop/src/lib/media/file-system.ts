import { isTauri, convertFileSrc } from '@tauri-apps/api/core';
import { BaseDirectory, mkdir, exists, writeFile } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { MediaItem } from '@repo/types';

/**
 * Persists a newly selected media asset into the local sandboxed storage directory.
 * In Tauri: writes to AppData/media/images/<id>-<filename> (throws on failure rather than falling back to ephemeral blob URLs).
 * In Web/Preview (!isTauri): creates an object URL.
 */
export async function saveMediaAssetToSandbox(
  file: File,
  mediaId: string
): Promise<{ localUri: string; name: string; size: number }> {
  if (isTauri()) {
    const dir = 'media/images';
    const dirExists = await exists(dir, { baseDir: BaseDirectory.AppData });
    if (!dirExists) {
      await mkdir(dir, { baseDir: BaseDirectory.AppData, recursive: true });
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const relativePath = `${dir}/${mediaId}-${sanitizedName}`;
    const arrayBuffer = await file.arrayBuffer();
    await writeFile(relativePath, new Uint8Array(arrayBuffer), {
      baseDir: BaseDirectory.AppData,
    });

    const appDir = await appDataDir();
    const absolutePath = await join(appDir, relativePath);
    return {
      localUri: absolutePath,
      name: file.name,
      size: file.size,
    };
  }

  return {
    localUri: URL.createObjectURL(file),
    name: file.name,
    size: file.size,
  };
}

/**
 * Resolves the display URI for a MediaItem:
 * - Returns cloud URL if available and valid.
 * - Otherwise converts local filesystem path using convertFileSrc in Tauri.
 * - Strips any legacy base64 data URLs to prevent canvas bloat.
 */
export function getMediaDisplayUri(item: MediaItem): string {
  if (item.url && !item.url.startsWith('data:')) {
    return item.url;
  }
  if (item.localUri) {
    if (
      isTauri() &&
      !item.localUri.startsWith('blob:') &&
      !item.localUri.startsWith('http://') &&
      !item.localUri.startsWith('https://')
    ) {
      try {
        return convertFileSrc(item.localUri);
      } catch {
        return item.localUri;
      }
    }
    return item.localUri;
  }
  return '';
}
