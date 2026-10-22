import { useCallback, useMemo, useRef, useState } from "react";
import type { NoteBlock, UpdateBlockInput } from "@/lib/types/notes";
import { updateBlock } from "@/lib/queries/note-blocks";

function applyOverlayToBlock(
  block: NoteBlock,
  patch: UpdateBlockInput | undefined,
): NoteBlock {
  if (!patch) return block;
  const merged = {
    ...block,
    ...patch,
    ...(patch.header === null ? { header: undefined } : {}),
    ...(patch.footer === null ? { footer: undefined } : {}),
  };
  return merged as NoteBlock;
}

/**
 * Manages in-memory block typing updates (`dirtyBlocksRef` + `dirtyOverlay`)
 * and commits them strictly on input `onBlur` (`commitBlock`), discrete structural
 * actions (`handleImmediateUpdate`), or editor exit (`flushBlocks`).
 */
export function useStagedBlockUpdates(liveBlocks: NoteBlock[]) {
  const [dirtyOverlay, setDirtyOverlay] = useState<
    Record<string, UpdateBlockInput>
  >({});
  const dirtyBlocksRef = useRef<Map<string, UpdateBlockInput>>(new Map());

  const blocks = useMemo<NoteBlock[]>(
    () =>
      liveBlocks.map((liveBlock) =>
        applyOverlayToBlock(liveBlock, dirtyOverlay[liveBlock.id]),
      ),
    [liveBlocks, dirtyOverlay],
  );

  const clearDirtyEntry = useCallback((blockId: string) => {
    dirtyBlocksRef.current.delete(blockId);
    setDirtyOverlay((prev) => {
      if (!(blockId in prev)) return prev;
      const next = { ...prev };
      delete next[blockId];
      return next;
    });
  }, []);

  // Stage typing updates in memory (zero SQLite / Outbox writes until blur or Done)
  const handleStageUpdate = useCallback(
    (blockId: string, updates: UpdateBlockInput) => {
      const prevDirty = dirtyBlocksRef.current.get(blockId) || {};
      const mergedDirty: UpdateBlockInput = { ...prevDirty, ...updates };
      dirtyBlocksRef.current.set(blockId, mergedDirty);

      setDirtyOverlay((prev) => ({
        ...prev,
        [blockId]: mergedDirty,
      }));
    },
    [],
  );

  // Commit a single block's staged changes to SQLite & Outbox (called onBlur)
  const commitBlock = useCallback(
    async (blockId: string) => {
      const pending = dirtyBlocksRef.current.get(blockId);
      if (!pending) return;
      clearDirtyEntry(blockId);
      try {
        await updateBlock(blockId, pending);
      } catch (err) {
        console.error("[BlockContainer] Commit block error:", err);
      }
    },
    [clearDirtyEntry],
  );

  // Immediately persist discrete structural updates (merges any staged edits for that block)
  const handleImmediateUpdate = useCallback(
    async (blockId: string, updates: UpdateBlockInput) => {
      const prevDirty = dirtyBlocksRef.current.get(blockId) || {};
      const merged: UpdateBlockInput = { ...prevDirty, ...updates };
      clearDirtyEntry(blockId);

      try {
        await updateBlock(blockId, merged);
      } catch (err) {
        console.error("[BlockContainer] Immediate update block error:", err);
      }
    },
    [clearDirtyEntry],
  );

  // Flush all uncommitted block edits to SQLite & Outbox (called on Done / Back / Background)
  const flushBlocks = useCallback(async () => {
    if (dirtyBlocksRef.current.size === 0) return;
    const entries = Array.from(dirtyBlocksRef.current.entries());
    dirtyBlocksRef.current.clear();
    setDirtyOverlay({});

    await Promise.all(
      entries.map(async ([blockId, changes]) => {
        try {
          await updateBlock(blockId, changes);
        } catch (err) {
          console.error("[BlockContainer] Flush block error:", err);
        }
      }),
    );
  }, []);

  return {
    blocks,
    clearDirtyEntry,
    handleStageUpdate,
    commitBlock,
    handleImmediateUpdate,
    flushBlocks,
  };
}
