import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NoteBlock, UpdateBlockInput } from "@/lib/types/notes";
import { updateBlock } from "@/lib/queries/note-blocks";

function applyOverlayToBlock(block: NoteBlock, patch?: UpdateBlockInput): NoteBlock {
  if (!patch) return block;
  return {
    ...block,
    ...patch,
    ...(patch.header === null ? { header: undefined } : {}),
    ...(patch.footer === null ? { footer: undefined } : {}),
  } as NoteBlock;
}

export function useStagedBlockUpdates(liveBlocks: NoteBlock[]) {
  const [dirtyOverlay, setDirtyOverlay] = useState<Record<string, UpdateBlockInput>>({});
  const dirtyBlocksRef = useRef<Map<string, UpdateBlockInput>>(new Map());
  const settlingRef = useRef<Map<string, NoteBlock | undefined>>(new Map());
  const liveRef = useRef(liveBlocks);

  useEffect(() => {
    liveRef.current = liveBlocks;
  });

  // Reconcile and clear overlay entries whose live rows have re-emitted from SQLite
  useEffect(() => {
    if (settlingRef.current.size === 0) return;
    const settledIds: string[] = [];
    for (const [id, prevBlock] of settlingRef.current.entries()) {
      const currentLive = liveBlocks.find((b) => b.id === id);
      if (currentLive !== prevBlock && !dirtyBlocksRef.current.has(id)) {
        settledIds.push(id);
      }
    }
    if (settledIds.length === 0) return;

    for (const id of settledIds) {
      settlingRef.current.delete(id);
    }

    setDirtyOverlay((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of settledIds) {
        if (id in next) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [liveBlocks]);

  const blocks = useMemo<NoteBlock[]>(
    () => liveBlocks.map((b) => applyOverlayToBlock(b, dirtyOverlay[b.id])),
    [liveBlocks, dirtyOverlay],
  );

  const clearDirtyEntry = useCallback((blockId: string) => {
    dirtyBlocksRef.current.delete(blockId);
    settlingRef.current.delete(blockId);
    setDirtyOverlay((prev) => {
      if (!(blockId in prev)) return prev;
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  }, []);

  const persistBlock = useCallback(
    async (blockId: string, changes: UpdateBlockInput) => {
      dirtyBlocksRef.current.delete(blockId);
      // Retain optimistic overlay until live SQLite re-emits so UI never flashes stale data
      setDirtyOverlay((prev) => ({ ...prev, [blockId]: changes }));
      settlingRef.current.set(blockId, liveRef.current.find((b) => b.id === blockId));

      try {
        await updateBlock(blockId, changes);
      } catch (err) {
        settlingRef.current.delete(blockId);
        clearDirtyEntry(blockId);
        console.error("[BlockContainer] Persist block error:", err);
      }
    },
    [clearDirtyEntry],
  );

  const handleStageUpdate = useCallback((blockId: string, updates: UpdateBlockInput) => {
    const merged: UpdateBlockInput = { ...dirtyBlocksRef.current.get(blockId), ...updates };
    dirtyBlocksRef.current.set(blockId, merged);
    setDirtyOverlay((prev) => ({ ...prev, [blockId]: merged }));
  }, []);

  const commitBlock = useCallback(
    async (blockId: string) => {
      const pending = dirtyBlocksRef.current.get(blockId);
      if (pending) await persistBlock(blockId, pending);
    },
    [persistBlock],
  );

  const handleImmediateUpdate = useCallback(
    async (blockId: string, updates: UpdateBlockInput) => {
      const merged: UpdateBlockInput = { ...dirtyBlocksRef.current.get(blockId), ...updates };
      await persistBlock(blockId, merged);
    },
    [persistBlock],
  );

  const flushBlocks = useCallback(async () => {
    if (dirtyBlocksRef.current.size === 0) return;
    const entries = Array.from(dirtyBlocksRef.current.entries());
    await Promise.all(entries.map(([id, changes]) => persistBlock(id, changes)));
  }, [persistBlock]);

  return {
    blocks,
    clearDirtyEntry,
    handleStageUpdate,
    commitBlock,
    handleImmediateUpdate,
    flushBlocks,
  };
}
