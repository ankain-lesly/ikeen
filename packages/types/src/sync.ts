import type { Folder, FolderChanges } from "./folders";
import type { Note, NoteChanges, NoteBlock } from "./notes";
import type { Reminder } from "./reminders";

export type SyncEntityType = "folders" | "notes" | "note_blocks" | "reminders";
export type SyncActionType = "upsert" | "delete";
export type SyncQueueStatus = "pending" | "in_flight" | "success" | "failed";

export type SyncStatus = "idle" | "syncing" | "offline" | "error";

export type SyncFailureCategory =
  | "transient_no_penalty"
  | "server_error"
  | "client_rejected";

export type BlockChanges = Partial<NoteBlock>;
export type ReminderChanges = Partial<Reminder>;
export type OutboxPayloadData = FolderChanges | NoteChanges | BlockChanges | ReminderChanges;

/**
 * Common mutation metadata outside of entity changes.
 * - id: Target entity UUID
 * - mutationId: Deterministic idempotency token `${entity}:${action}:${queueId}`
 * - action: 'upsert' | 'delete'
 * - version: Incremental optimistic concurrency version
 * - updatedAt: Client mutation timestamp for LWW conflict resolution
 */
export interface SyncMutationPayload<
  TChanges extends FolderChanges | NoteChanges | BlockChanges | ReminderChanges,
> {
  id: string;
  mutationId: string;
  action: SyncActionType;
  version?: number;
  updatedAt: string;
  changes: TChanges;
}

export type SyncMutationBase = SyncMutationPayload<FolderChanges | NoteChanges | BlockChanges | ReminderChanges>;

/**
 * Generic sync mutation payload: metadata sits outside, entity fields sit strictly inside `changes`.
 */
export type FolderMutationPayload = SyncMutationPayload<FolderChanges>;
export type NoteMutationPayload = SyncMutationPayload<NoteChanges>;
export type BlockMutationPayload = SyncMutationPayload<BlockChanges>;
export type ReminderMutationPayload = SyncMutationPayload<ReminderChanges>;

export interface SyncPushPayload {
  clientTimestamp: string;
  folders?: FolderMutationPayload[];
  notes?: NoteMutationPayload[];
  note_blocks?: BlockMutationPayload[];
  reminders?: ReminderMutationPayload[];
}

export interface SyncPushResponse {
  success: boolean;
  serverTimestamp: string;
}

export interface SyncPullResponse {
  serverTimestamp: string;
  folders: Folder[];
  notes: Note[];
  note_blocks?: NoteBlock[];
  reminders?: Reminder[];
}

export interface RealtimeAuthResponse {
  enabled: boolean;
  tokenRequest?: Record<string, unknown>;
  error?: string;
  message?: string;
}

export interface AppUpdateInfo {
  version: string;
  build?: number;
  mandatory: boolean;
  title: string;
  description: string;
  url: string;
}

export interface CheckUpdatesQuery {
  platform?: string;
  currentVersion?: string;
  currentBuild?: string;
}
