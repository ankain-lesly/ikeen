import * as FileSystem from "expo-file-system/legacy";
import { and, eq, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaSyncOutbox, noteBlocks } from "@/db/schema";
import { useMediaUploadStore } from "./use-media-upload-store";
import { enqueueOutbox } from "@/lib/sync/outbox";
import { unpackNoteBlock, toBlockOutboxPayload } from "@/lib/queries/block-content.codec";
import type { MediaBlock, MediaItem } from "@/lib/types/notes";
import { env } from "@/lib/env";

const MAX_RETRIES = 5;
const CONCURRENCY_LIMIT = 2;

let isWorkerRunning = false;

export interface MediadockUploadResponse {
  id: string;
  bucket_id: string;
  filename: string;
  original_filename: string;
  url: string;
  mime_type: string;
  size: number;
  status: string;
  metadata?: {
    resource_type?: string;
    folder?: string;
  };
  created_at: string;
}

export type MediaFailureCategory =
  | "transient_no_penalty"
  | "server_error"
  | "client_rejected";

/**
 * Classifies HTTP status or network errors for media upload retries.
 */
function classifyMediaUploadFailure(status?: number): MediaFailureCategory {
  if (
    status === undefined ||
    status === 0 ||
    status === 408 ||
    status === 429
  ) {
    return "transient_no_penalty";
  }
  if (status >= 500 && status < 600) {
    return "server_error";
  }
  return "client_rejected";
}

/**
 * Enqueues a local sandboxed media asset for background cloud upload.
 */
export async function enqueueMediaUpload(params: {
  id: string; // MediaItem.id
  blockId: string;
  localUri: string;
}): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(mediaSyncOutbox)
    .values({
      id: params.id,
      blockId: params.blockId,
      localUri: params.localUri,
      status: "pending",
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: mediaSyncOutbox.id,
      set: {
        status: "pending",
        updatedAt: now,
      },
    });

  useMediaUploadStore.getState().setStatus(params.id, "pending");

  // Trigger worker processing asynchronously
  void processMediaUploadQueue();
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
 * Background worker processing pending or retry-eligible failed jobs from media_sync_outbox
 * with bounded concurrency (2 parallel uploads). Queries strictly by indexed status.
 * Continues in a drain loop until all eligible jobs are processed.
 */
export async function processMediaUploadQueue(): Promise<void> {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  try {
    while (true) {
      const pendingJobs = await db
        .select()
        .from(mediaSyncOutbox)
        .where(
          or(
            eq(mediaSyncOutbox.status, "pending"),
            and(
              eq(mediaSyncOutbox.status, "failed"),
              lt(mediaSyncOutbox.retryCount, MAX_RETRIES),
            ),
          ),
        )
        .limit(6);

      if (pendingJobs.length === 0) break;

      // Process in chunks of CONCURRENCY_LIMIT
      for (let i = 0; i < pendingJobs.length; i += CONCURRENCY_LIMIT) {
        const chunk = pendingJobs.slice(i, i + CONCURRENCY_LIMIT);
        await Promise.allSettled(chunk.map((job) => uploadMediaJob(job)));
      }
    }
  } catch (err) {
    console.warn("[MediaUploadService] Queue processing error:", err);
  } finally {
    isWorkerRunning = false;
  }
}

async function uploadMediaJob(job: {
  id: string;
  blockId: string;
  localUri: string;
  retryCount: number;
}): Promise<void> {
  const store = useMediaUploadStore.getState();
  store.setStatus(job.id, "uploading");

  const now = new Date().toISOString();
  await db
    .update(mediaSyncOutbox)
    .set({ status: "uploading", updatedAt: now })
    .where(eq(mediaSyncOutbox.id, job.id));

  let httpStatus: number | undefined;

  try {
    // Check if local file exists
    const fileInfo = await FileSystem.getInfoAsync(job.localUri);
    if (!fileInfo.exists) {
      throw new Error(`Local file not found at ${job.localUri}`);
    }

    // Build headers from strictly validated env
    const headers: Record<string, string> = {
      "X-Api-Key": env.MEDIADOCK_API_KEY,
      "X-Api-Secret": env.MEDIADOCK_API_SECRET,
    };

    const uploadTask = FileSystem.createUploadTask(
      env.MEDIADOCK_URL,
      job.localUri,
      {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        headers,
        parameters: { folder: "notes-media" },
      },
      (data) => {
        if (data.totalBytesExpectedToSend > 0) {
          const ratio = data.totalBytesSent / data.totalBytesExpectedToSend;
          store.setProgress(job.id, ratio);
        }
      },
    );

    const result = await uploadTask.uploadAsync();
    httpStatus = result?.status;

    if (!result || result.status < 200 || result.status >= 300) {
      throw new Error(
        `Upload failed with HTTP status ${result?.status}: ${result?.body}`,
      );
    }

    let remoteUrl: string | undefined;
    try {
      const responseData = JSON.parse(result.body) as MediadockUploadResponse;
      remoteUrl = responseData.url;
    } catch {
      throw new Error("Invalid JSON response from mediadock uploader");
    }

    if (!remoteUrl) {
      throw new Error("Missing remote URL in mediadock response");
    }

    // Reconcile into local SQLite block
    await reconcileUploadedMediaUrl(job.blockId, job.id, remoteUrl);

    // Delete job from media_sync_outbox
    await db.delete(mediaSyncOutbox).where(eq(mediaSyncOutbox.id, job.id));
    store.setStatus(job.id, "completed");
  } catch (err: any) {
    const errorMessage = err?.message || "Upload failed";
    console.warn(`[MediaUploadService] Job ${job.id} failed:`, errorMessage);

    const category = classifyMediaUploadFailure(httpStatus);
    const updatedTime = new Date().toISOString();

    if (category === "transient_no_penalty") {
      // Reset back to pending without incrementing retry count
      await db
        .update(mediaSyncOutbox)
        .set({
          status: "pending",
          lastError: errorMessage,
          updatedAt: updatedTime,
        })
        .where(eq(mediaSyncOutbox.id, job.id));
      store.setStatus(job.id, "pending", errorMessage);
    } else {
      const nextRetry = job.retryCount + 1;
      const finalStatus =
        category === "client_rejected" || nextRetry >= MAX_RETRIES
          ? "failed"
          : "pending";

      await db
        .update(mediaSyncOutbox)
        .set({
          status: finalStatus,
          retryCount: nextRetry,
          lastError: errorMessage,
          updatedAt: updatedTime,
        })
        .where(eq(mediaSyncOutbox.id, job.id));

      store.setStatus(job.id, finalStatus, errorMessage);
    }
  }
}

/**
 * Reconciles the remote cloud URL into the note_blocks SQLite row and triggers
 * standard outbox sync so other devices receive the cloud URL.
 */
async function reconcileUploadedMediaUrl(
  blockId: string,
  mediaId: string,
  remoteUrl: string,
): Promise<void> {
  const [existingRow] = await db
    .select()
    .from(noteBlocks)
    .where(eq(noteBlocks.id, blockId))
    .limit(1);

  if (!existingRow) return;

  const block = unpackNoteBlock(existingRow);
  if (block.type !== "media") return;

  const updatedContent = block.content.map((item: MediaItem) =>
    item.id === mediaId ? { ...item, url: remoteUrl } : item,
  );

  const now = new Date().toISOString();
  const rawContent = JSON.stringify(updatedContent);

  const [updatedRow] = await db
    .update(noteBlocks)
    .set({
      content: rawContent,
      updatedAt: now,
    })
    .where(eq(noteBlocks.id, blockId))
    .returning();

  if (updatedRow) {
    const updatedBlock = unpackNoteBlock(updatedRow);
    await enqueueOutbox(
      "note_blocks",
      updatedBlock.id,
      "upsert",
      toBlockOutboxPayload(updatedBlock),
    );
  }
}

/**
 * Startup and resume sync: processes pending or retry-eligible failed jobs from media_sync_outbox.
 * Never scans the full note_blocks entity table.
 */
export async function reconcileUnsyncedMedia(): Promise<void> {
  try {
    void processMediaUploadQueue();
  } catch (err) {
    console.warn("[MediaUploadService] Resume sync error:", err);
  }
}

/**
 * Retries a single failed media job.
 */
export async function retrySingleMediaUpload(mediaId: string): Promise<void> {
  try {
    const now = new Date().toISOString();
    await db
      .update(mediaSyncOutbox)
      .set({
        status: "pending",
        retryCount: 0,
        updatedAt: now,
      })
      .where(eq(mediaSyncOutbox.id, mediaId));

    useMediaUploadStore.getState().setStatus(mediaId, "pending");
    void processMediaUploadQueue();
  } catch (err) {
    console.warn(`[MediaUploadService] Failed to retry job ${mediaId}:`, err);
  }
}

/**
 * Retries all failed media jobs when network recovers or user requests retry.
 */
export async function retryFailedMediaJobs(): Promise<number> {
  try {
    const now = new Date().toISOString();
    await db
      .update(mediaSyncOutbox)
      .set({
        status: "pending",
        retryCount: 0,
        updatedAt: now,
      })
      .where(eq(mediaSyncOutbox.status, "failed"));

    void processMediaUploadQueue();
    return 1;
  } catch (err) {
    console.warn("[MediaUploadService] Failed to retry jobs:", err);
    return 0;
  }
}

/**
 * Cross-device cache handler: When a remote block is pulled with a remote URL
 * and no localUri, downloads it to local sandbox for instant offline viewing.
 */
export async function cacheRemoteMediaLocally(
  item: MediaItem,
  blockId?: string,
): Promise<string | null> {
  if (!item.url || item.localUri) return item.localUri || null;

  try {
    const category =
      item.mediaType === "audio"
        ? "audio"
        : item.mediaType === "file"
          ? "files"
          : "images";

    const ext = item.url.split(".").pop()?.split(/[?#]/)[0] || "bin";
    const destDir = `${FileSystem.documentDirectory}media/${category}/`;
    const destUri = `${destDir}${item.id}.${ext}`;

    const dirInfo = await FileSystem.getInfoAsync(destDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
    }

    const downloadResult = await FileSystem.downloadAsync(item.url, destUri);

    if (blockId && downloadResult.uri) {
      const [existingRow] = await db
        .select()
        .from(noteBlocks)
        .where(eq(noteBlocks.id, blockId))
        .limit(1);

      if (existingRow && existingRow.type === "media") {
        const block = unpackNoteBlock(existingRow);
        if (block.type === "media") {
          const updatedContent = block.content.map((i: MediaItem) =>
            i.id === item.id ? { ...i, localUri: downloadResult.uri } : i,
          );
          await db
            .update(noteBlocks)
            .set({ content: JSON.stringify(updatedContent) })
            .where(eq(noteBlocks.id, blockId));
        }
      }
    }

    return downloadResult.uri;
  } catch (err) {
    console.warn("[MediaUploadService] Failed to cache remote media:", err);
    return null;
  }
}
