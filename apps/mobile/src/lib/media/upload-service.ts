import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { and, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db/client";
import { mediaSyncOutbox, noteBlocks } from "@/db/schema";
import { useMediaUploadStore } from "./use-media-upload-store";
import { enqueueOutbox } from "@/lib/sync/outbox";
import {
  unpackNoteBlock,
  toBlockOutboxPayload,
} from "@/lib/queries/block-content.codec";
import type { MediaItem } from "@/lib/types/notes";
import { env } from "@/lib/env";
import { useAuthStore } from "@/lib/auth/auth-store";
import { log } from "@repo/utils";

const MAX_RETRIES = 5;
const CONCURRENCY_LIMIT = 2;
const SEED_STORAGE_KEY = "@ikeen/media_outbox_seeded_v1";

let isWorkerRunning = false;
let hasQueuedRun = false;

export interface MediadockUploadResponse {
  data: {
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
  };
}

export type MediaFailureCategory =
  "transient_no_penalty" | "server_error" | "client_rejected";

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
  log("[Media:Enqueue]", {
    id: params.id,
    blockId: params.blockId,
    localUri: params.localUri,
  });

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
    log("[Media:Cancel]", { id: mediaId });
    await db.delete(mediaSyncOutbox).where(eq(mediaSyncOutbox.id, mediaId));
    useMediaUploadStore.getState().clearUpload(mediaId);
  } catch (err) {
    console.warn(
      `[MediaUploadService] Failed to cancel media upload ${mediaId}:`,
      err,
    );
  }
}

/**
 * Background worker processing pending jobs from media_sync_outbox.
 * Mirrors Note Sync (SyncManager.push):
 * - NO while(true) loop that re-fetches failing jobs.
 * - Concurrency control with `hasQueuedRun` flag.
 * - Upfront status lock (`uploading`) before network dispatch.
 * - Aborts processing immediately if offline or connection drops.
 */
export async function processMediaUploadQueue(): Promise<void> {
  if (!useAuthStore.getState().isAuthenticated) return;

  if (isWorkerRunning) {
    hasQueuedRun = true;
    return;
  }
  isWorkerRunning = true;

  try {
    // 1. Check network connectivity before starting
    const netState = await NetInfo.fetch();
    if (!netState.isConnected || !netState.isInternetReachable) {
      log("[Media:Queue:OfflineAbort]");
      return;
    }

    // 2. Fetch next batch of pending jobs
    const pendingJobs = await db
      .select()
      .from(mediaSyncOutbox)
      .where(eq(mediaSyncOutbox.status, "pending"))
      .limit(CONCURRENCY_LIMIT);

    if (pendingJobs.length === 0) return;

    // 3. Lock jobs to 'uploading' upfront in SQLite (mirrors markOutboxInFlight)
    const now = new Date().toISOString();
    const batchIds = pendingJobs.map((j) => j.id);
    await db
      .update(mediaSyncOutbox)
      .set({ status: "uploading", updatedAt: now })
      .where(inArray(mediaSyncOutbox.id, batchIds));

    for (const job of pendingJobs) {
      useMediaUploadStore.getState().setStatus(job.id, "uploading");
    }

    log("[Media:Queue:BatchStart]", {
      count: pendingJobs.length,
      ids: batchIds,
    });

    // 4. Concurrently upload batch
    const results = await Promise.allSettled(
      pendingJobs.map((job) => uploadMediaJob(job)),
    );

    // 5. Inspect results: if any job failed due to a network drop, abort queue drainage
    const hadNetworkDrop = results.some(
      (r) =>
        r.status === "rejected" &&
        ((r.reason as any)?.category === "transient_no_penalty" ||
          /network|offline|timeout/i.test((r.reason as any)?.message || "")),
    );

    if (hadNetworkDrop) {
      log(
        "[Media:Queue:NetworkHalt]",
        "Pausing media queue until network reconnects.",
      );
      return;
    }

    // 6. If more pending jobs exist, trigger next batch
    const [remaining] = await db
      .select({ id: mediaSyncOutbox.id })
      .from(mediaSyncOutbox)
      .where(eq(mediaSyncOutbox.status, "pending"))
      .limit(1);

    if (remaining) {
      hasQueuedRun = true;
    }
  } catch (err) {
    log("[Media:Queue:Error]", {
      error: err instanceof Error ? err.message : String(err),
    });
  } finally {
    isWorkerRunning = false;
    if (hasQueuedRun) {
      hasQueuedRun = false;
      void processMediaUploadQueue();
    }
  }
}

async function uploadMediaJob(job: {
  id: string;
  blockId: string;
  localUri: string;
  retryCount: number;
}): Promise<void> {
  log("[Media:Upload:Start]", {
    id: job.id,
    blockId: job.blockId,
    localUri: job.localUri,
    retryCount: job.retryCount,
  });

  const store = useMediaUploadStore.getState();
  store.setStatus(job.id, "uploading");

  let httpStatus: number | undefined;

  try {
    // Check if local file exists
    const fileInfo = await FileSystem.getInfoAsync(job.localUri);
    if (!fileInfo.exists) {
      const missingErr: any = new Error(
        `Local file not found at ${job.localUri}`,
      );
      missingErr.category = "client_rejected";
      throw missingErr;
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
        parameters: { folder: "notes" },
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
      remoteUrl = responseData.data.url;
    } catch {
      throw new Error("Invalid JSON response from mediadock uploader");
    }

    if (!remoteUrl) {
      throw new Error("Missing remote URL in mediadock response");
    }

    // Reconcile into local SQLite block
    await reconcileUploadedMediaUrl(job.blockId, job.id, remoteUrl);

    // Persist completed status in media_sync_outbox for inspection
    const updatedNow = new Date().toISOString();
    await db
      .update(mediaSyncOutbox)
      .set({ status: "completed", updatedAt: updatedNow })
      .where(eq(mediaSyncOutbox.id, job.id));
    store.setStatus(job.id, "completed");

    log("[Media:Upload:Success]", {
      id: job.id,
      blockId: job.blockId,
      remoteUrl,
    });
  } catch (err: any) {
    const errorMessage = err?.message || "Upload failed";
    const category: MediaFailureCategory =
      err?.category || classifyMediaUploadFailure(httpStatus);
    const updatedTime = new Date().toISOString();

    log("[Media:Upload:Error]", {
      id: job.id,
      blockId: job.blockId,
      httpStatus,
      category,
      error: errorMessage,
    });
    console.warn(`[MediaUploadService] Job ${job.id} failed:`, errorMessage);

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

    throw { category, message: errorMessage };
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
    log("[Media:Reconcile:Success]", {
      blockId,
      mediaId,
      remoteUrl,
    });
  }
}

/**
 * Resets stale uploading items and recoverable failed items back to pending on startup.
 * Queries strictly by indexed status without scanning note blocks.
 */
export async function resetMediaInFlightOnStartup(): Promise<void> {
  const now = new Date().toISOString();
  try {
    // 1. Reset stale in-flight uploading items from app crashes/abrupt closes
    await db
      .update(mediaSyncOutbox)
      .set({ status: "pending", updatedAt: now })
      .where(eq(mediaSyncOutbox.status, "uploading"));

    // 2. Automatically recover any failed items that still have valid retries remaining
    await db
      .update(mediaSyncOutbox)
      .set({ status: "pending", updatedAt: now })
      .where(
        and(
          eq(mediaSyncOutbox.status, "failed"),
          lt(mediaSyncOutbox.retryCount, MAX_RETRIES),
        ),
      );

    log(
      "[Media:Outbox:StartupRecovery]",
      "Reset uploading and recoverable failed media items to pending on startup.",
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log("[Media:Outbox:Error]", {
      action: "resetMediaInFlightOnStartup",
      error: message,
    });
    console.warn(
      "[MediaUploadService] Failed to reset in-flight/failed media items on startup:",
      message,
    );
  }
}

/**
 * Startup and resume sync: resets stranded in-flight media items, then drains the queue.
 * Strictly queries indexed outbox status. Never scans the full note_blocks entity table.
 */
export async function reconcileUnsyncedMedia(): Promise<void> {
  try {
    log("[Media:Resume:Triggered]");
    await resetMediaInFlightOnStartup();
    void processMediaUploadQueue();
  } catch (err) {
    console.warn("[MediaUploadService] Resume sync error:", err);
  }
}

/**
 * One-time historical media seeder:
 * - Scans existing note_blocks once.
 * - Seeds already-uploaded items (has url) as 'completed'.
 * - Seeds unuploaded items (localUri && !url) as 'pending'.
 * - Records completion in AsyncStorage so it NEVER runs again.
 */
export async function seedHistoricalMediaOutboxOnce(): Promise<void> {
  try {
    const isSeeded = await AsyncStorage.getItem(SEED_STORAGE_KEY);
    if (isSeeded === "true") return;

    log("[Media:Seed:Start]");

    const mediaBlocks = await db
      .select()
      .from(noteBlocks)
      .where(eq(noteBlocks.type, "media"));

    const existingRows = await db
      .select({ id: mediaSyncOutbox.id })
      .from(mediaSyncOutbox);
    const existingIds = new Set(existingRows.map((r) => r.id));

    const now = new Date().toISOString();
    let seededCount = 0;

    for (const row of mediaBlocks) {
      const block = unpackNoteBlock(row);
      if (block.type !== "media" || !Array.isArray(block.content)) continue;

      for (const item of block.content) {
        if (!item.id || existingIds.has(item.id)) continue;

        const isUploaded = Boolean(item.url && item.url.trim().length > 0);
        const status = isUploaded ? "completed" : "pending";
        const uri = item.localUri || item.url || "";

        if (!uri) continue;

        await db
          .insert(mediaSyncOutbox)
          .values({
            id: item.id,
            blockId: block.id,
            localUri: uri,
            status,
            retryCount: 0,
            createdAt: block.createdAt || now,
            updatedAt: block.updatedAt || now,
          })
          .onConflictDoNothing();

        existingIds.add(item.id);
        seededCount++;
      }
    }

    await AsyncStorage.setItem(SEED_STORAGE_KEY, "true");
    log("[Media:Seed:Success]", { seededCount });
  } catch (err) {
    console.warn(
      "[MediaUploadService] One-time media outbox seeding error:",
      err,
    );
  }
}

/**
 * Retries a single failed media job.
 */
export async function retrySingleMediaUpload(mediaId: string): Promise<void> {
  try {
    log("[Media:Retry:Single]", { id: mediaId });
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
    log("[Media:Retry:All]");
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
 * Clears all media jobs marked 'completed' from media_sync_outbox.
 */
export async function clearCompletedMediaJobs(): Promise<number> {
  try {
    log("[Media:Outbox:ClearCompleted]");
    const deleted = await db
      .delete(mediaSyncOutbox)
      .where(eq(mediaSyncOutbox.status, "completed"))
      .returning({ id: mediaSyncOutbox.id });
    return deleted.length;
  } catch (err) {
    console.warn("[MediaUploadService] Failed to clear completed jobs:", err);
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
    log("[Media:Cache:Start]", { id: item.id, url: item.url, blockId });
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

    log("[Media:Cache:Success]", {
      id: item.id,
      localUri: downloadResult.uri,
      blockId,
    });
    return downloadResult.uri;
  } catch (err) {
    log("[Media:Cache:Error]", {
      id: item.id,
      error: err instanceof Error ? err.message : String(err),
    });
    console.warn("[MediaUploadService] Failed to cache remote media:", err);
    return null;
  }
}
