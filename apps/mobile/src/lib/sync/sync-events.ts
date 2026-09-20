type SyncTriggerListener = () => void;

let syncListener: SyncTriggerListener | null = null;

/**
 * Registers the sync handler callback (called by SyncManager on initialization).
 */
export function registerSyncTrigger(fn: SyncTriggerListener): () => void {
  syncListener = fn;
  return () => {
    if (syncListener === fn) {
      syncListener = null;
    }
  };
}

/**
 * Dispatches a request to trigger an incremental sync cycle.
 * Decouples query mutations and outbox enqueueing from directly importing SyncManager.
 */
export function triggerSync(): void {
  if (syncListener) {
    try {
      syncListener();
    } catch (err) {
      console.warn('[SyncEvents] Failed to trigger sync:', err);
    }
  }
}
