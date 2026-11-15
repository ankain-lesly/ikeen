import { db } from '@/db/client';
import { mediaSyncOutbox, noteBlocks } from '@/db/schema';
import { eq, inArray, and, lt } from 'drizzle-orm';
import { useMediaUploadStore } from './use-media-upload-store';
import { useAuthStore } from '@/stores/use-auth-store';
import { syncApi } from '@/lib/sync/sync-api';
import { enqueueOutbox, classifySyncPushFailure } from '@/lib/sync/outbox';
import { unpackDesktopNoteBlock, toDesktopBlockOutboxPayload } from '@/lib/queries/block-codec';
import type { MediaItem } from '@repo/types';
import { readFile } from '@tauri-apps/plugin-fs';
import { isTauri } from '@tauri-apps/api/core';

const MAX_RETRIES = 5;
const CONCURRENCY_LIMIT = 2;

let isWorkerRunning = false;
let hasQueuedRun = false;

// Listeners notified when a media item's remote URL has been reconciled into SQLite
type MediaUploadedListener = (blockId: string) => void;
const mediaUploadedListeners = new Set<MediaUploadedListener>();

export function onMediaUploaded(listener: MediaUploadedListener): () => void {
  mediaUploadedListeners.add(listener);
  return () => mediaUploadedListeners.delete(listener);
}

class UploadHttpError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'UploadHttpError';
  }
}

export interface MediaUploadResponse {
  ok: boolean;
  data: {
    id: string;
    url: string;
    filename: string;
    original_filename?: string;
    mime_type?: string;
    size?: number;
  };
}

/**
 * Enqueues a local sandboxed media asset for background cloud upload.
 * Uses onConflictDoNothing so an already uploading/completed job is never reset.
 * Does NOT eagerly trigger upload immediately; uploads run strictly during sync (matches Mobile pattern).
 */
export async function enqueueMediaUpload(params: {
  id: string;
  blockId: string;
  localUri: string;
}): Promise<void> {
  const now = new Date().toISOString();

  try {
    await db
      .insert(mediaSyncOutbox)
      .values({
        id: params.id,
        blockId: params.blockId,
        localUri: params.localUri,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: mediaSyncOutbox.id });

    const existingStatus = useMediaUploadStore.getState().uploads[params.id]?.status;
    if (!existingStatus) {
      useMediaUploadStore.getState().setStatus(params.id, 'pending');
    }
  } catch (err) {
    console.warn('[MediaUploadService] Failed to enqueue media upload:', err);
  }
}

/**
 * Explicitly retries a failed media upload job.
 */
export async function retryMediaUpload(mediaId: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    await db
      .update(mediaSyncOutbox)
      .set({
        status: 'pending',
        retryCount: 0,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(mediaSyncOutbox.id, mediaId));

    useMediaUploadStore.getState().setStatus(mediaId, 'pending');
    void processMediaUploadQueue();
  } catch (err) {
    console.warn(`[MediaUploadService] Failed to retry media upload ${mediaId}:`, err);
  }
}

/**
 * Cancels a pending or in-flight upload job and cleans up store state.
 */
export async function cancelMediaUpload(mediaId: string): Promise<void> {
  try {
    await db.delete(mediaSyncOutbox).where(eq(mediaSyncOutbox.id, mediaId));
    useMediaUploadStore.getState().clearUpload(mediaId);
  } catch (err) {
    console.warn(`[MediaUploadService] Failed to cancel media upload ${mediaId}:`, err);
  }
}

/**
 * Background worker processing pending jobs from media_sync_outbox.
 * Strictly invoked during syncManager.sync() cycles.
 */
export async function processMediaUploadQueue(): Promise<void> {
  const authState = useAuthStore.getState();
  if (!authState.isAuthenticated || !authState.token) {
    return;
  }

  if (isWorkerRunning) {
    hasQueuedRun = true;
    return;
  }
  isWorkerRunning = true;

  try {
    const pendingJobs = await db
      .select()
      .from(mediaSyncOutbox)
      .where(eq(mediaSyncOutbox.status, 'pending'))
      .limit(CONCURRENCY_LIMIT);

    if (pendingJobs.length === 0) return;

    const now = new Date().toISOString();
    const batchIds = pendingJobs.map((j) => j.id);
    await db
      .update(mediaSyncOutbox)
      .set({ status: 'uploading', updatedAt: now })
      .where(inArray(mediaSyncOutbox.id, batchIds));

    for (const job of pendingJobs) {
      useMediaUploadStore.getState().setStatus(job.id, 'uploading');
    }

    await Promise.allSettled(pendingJobs.map((job) => uploadMediaJob(job)));

    const [remaining] = await db
      .select({ id: mediaSyncOutbox.id })
      .from(mediaSyncOutbox)
      .where(eq(mediaSyncOutbox.status, 'pending'))
      .limit(1);

    if (remaining) {
      hasQueuedRun = true;
    }
  } catch (err) {
    console.warn('[MediaUploadService] Queue processing error:', err);
  } finally {
    isWorkerRunning = false;
    if (hasQueuedRun) {
      hasQueuedRun = false;
      void processMediaUploadQueue();
    }
  }
}

function inferMimeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
}

async function getJobBlobAndName(job: {
  id: string;
  blockId: string;
  localUri: string;
}): Promise<{ blob: Blob; filename: string }> {
  const filename = job.localUri.split(/[\\/]/).pop() || `media-${job.id}.jpg`;
  const mime = inferMimeFromFilename(filename);

  if (
    isTauri() &&
    !job.localUri.startsWith('blob:') &&
    !job.localUri.startsWith('http://') &&
    !job.localUri.startsWith('https://')
  ) {
    const bytes = await readFile(job.localUri);
    return { blob: new Blob([bytes], { type: mime }), filename };
  }

  const res = await fetch(job.localUri);
  const blob = await res.blob();
  return { blob: new Blob([blob], { type: mime }), filename };
}

async function uploadMediaJob(job: {
  id: string;
  blockId: string;
  localUri: string;
  retryCount: number;
}): Promise<void> {
  const store = useMediaUploadStore.getState();
  store.setStatus(job.id, 'uploading');

  try {
    const { blob, filename } = await getJobBlobAndName(job);

    const token = useAuthStore.getState().token;
    const baseUrl = syncApi.getBaseUrl().replace(/\/+$/, '');
    const uploadUrl = baseUrl.endsWith('/api/v1')
      ? `${baseUrl}/media/upload`
      : `${baseUrl}/api/v1/media/upload`;

    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('folder', 'notes');

    const result = await new Promise<MediaUploadResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          store.setProgress(job.id, e.loaded / e.total);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as MediaUploadResponse);
          } catch {
            reject(new UploadHttpError('Invalid JSON response from media upload endpoint', xhr.status));
          }
        } else {
          reject(
            new UploadHttpError(`Upload failed with HTTP ${xhr.status}: ${xhr.responseText}`, xhr.status)
          );
        }
      };

      xhr.onerror = () => reject(new UploadHttpError('Network error during media upload', 0));
      xhr.ontimeout = () => reject(new UploadHttpError('Timeout during media upload', 408));
      xhr.send(formData);
    });

    const remoteUrl = result.data?.url;
    if (!remoteUrl) {
      throw new Error('Missing remote URL in media upload response');
    }

    await reconcileUploadedMediaUrl(job.blockId, job.id, remoteUrl, result.data.original_filename);

    const updatedNow = new Date().toISOString();
    await db
      .update(mediaSyncOutbox)
      .set({ status: 'completed', updatedAt: updatedNow })
      .where(eq(mediaSyncOutbox.id, job.id));

    store.setStatus(job.id, 'completed');
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const httpStatus = err instanceof UploadHttpError ? err.status : undefined;
    const category = classifySyncPushFailure(httpStatus);
    const updatedNow = new Date().toISOString();

    if (category === 'transient_no_penalty') {
      await db
        .update(mediaSyncOutbox)
        .set({
          status: 'pending',
          lastError: errorMessage,
          updatedAt: updatedNow,
        })
        .where(eq(mediaSyncOutbox.id, job.id));
      store.setStatus(job.id, 'pending', errorMessage);
    } else {
      const nextRetry = job.retryCount + 1;
      const finalStatus =
        category === 'client_rejected' || nextRetry >= MAX_RETRIES ? 'failed' : 'pending';

      await db
        .update(mediaSyncOutbox)
        .set({
          status: finalStatus,
          retryCount: nextRetry,
          lastError: errorMessage,
          updatedAt: updatedNow,
        })
        .where(eq(mediaSyncOutbox.id, job.id));
      store.setStatus(job.id, finalStatus, errorMessage);
    }

    console.warn(`[MediaUploadService] Job ${job.id} failed:`, errorMessage);
  }
}

/**
 * Reconciles the remote cloud URL into the note_blocks SQLite row, triggers
 * standard outbox sync, and notifies active editor listeners so in-memory state stays fresh.
 */
async function reconcileUploadedMediaUrl(
  blockId: string,
  mediaId: string,
  remoteUrl: string,
  originalFilename?: string
): Promise<void> {
  try {
    const [existingRow] = await db
      .select()
      .from(noteBlocks)
      .where(eq(noteBlocks.id, blockId))
      .limit(1);

    if (!existingRow) return;

    const block = unpackDesktopNoteBlock(existingRow);
    if (block.type !== 'media') return;

    const updatedContent = block.content.map((item: MediaItem) =>
      item.id === mediaId
        ? {
            ...item,
            url: remoteUrl,
            name: item.name || originalFilename || item.name,
          }
        : item
    );

    const now = new Date().toISOString();
    const rawContent = JSON.stringify(updatedContent);

    await db
      .update(noteBlocks)
      .set({
        content: rawContent,
        updatedAt: now,
      })
      .where(eq(noteBlocks.id, blockId));

    const updatedBlock = {
      ...block,
      content: updatedContent,
      updatedAt: now,
    };

    await enqueueOutbox(
      'note_blocks',
      blockId,
      'upsert',
      toDesktopBlockOutboxPayload(updatedBlock)
    );

    for (const listener of mediaUploadedListeners) {
      listener(blockId);
    }
  } catch (err) {
    console.error('[MediaUploadService] Failed to reconcile media URL:', err);
  }
}

/**
 * Resets stale uploading items and recoverable failed items back to pending on startup.
 */
export async function resetMediaInFlightOnStartup(): Promise<void> {
  const now = new Date().toISOString();
  try {
    await db
      .update(mediaSyncOutbox)
      .set({ status: 'pending', updatedAt: now })
      .where(eq(mediaSyncOutbox.status, 'uploading'));

    await db
      .update(mediaSyncOutbox)
      .set({ status: 'pending', updatedAt: now })
      .where(
        and(
          eq(mediaSyncOutbox.status, 'failed'),
          lt(mediaSyncOutbox.retryCount, MAX_RETRIES)
        )
      );
  } catch (err) {
    console.warn('[MediaUploadService] Failed to reset in-flight media on startup:', err);
  }
}
