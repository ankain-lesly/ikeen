import { useCallback, useEffect, useMemo } from 'react';
import {
  isScratchpadNote,
  formatScratchpadTags,
  removeScratchpadTag,
  SCRATCHPAD_TAG,
} from '@repo/utils';
import { useSettingsStore } from '@/lib/settings/settings-store';
import { createNote, updateNote, useLiveNotes } from './notes';
import type { NoteSelect as Note } from '@/lib/types/notes';

export interface UseLiveScratchpadResult {
  scratchpadNote: Note | null;
  isInitialized: boolean;
  isLoading: boolean;
  createScratchpad: () => Promise<Note>;
  assignExistingNote: (note: Note) => Promise<void>;
  resetScratchpad: () => Promise<void>;
}

export function useLiveScratchpadNote(): UseLiveScratchpadResult {
  const scratchpadNoteId = useSettingsStore((s) => s.scratchpadNoteId);
  const setScratchpadNoteId = useSettingsStore((s) => s.setScratchpadNoteId);

  // Retrieve all notes including archived, excluding soft-deleted
  const { data: notes = [], isLoading } = useLiveNotes({
    includeArchived: true,
    includeDeleted: false,
    withBlocks: true,
  });

  // Resolve scratchpad note:
  // 1. By cached client ID if valid and not deleted
  // 2. By canonical cross-device tag ('scratchpad')
  const scratchpadNote = useMemo(() => {
    if (scratchpadNoteId) {
      const cached = notes.find((n) => n.id === scratchpadNoteId && !n.deletedAt);
      if (cached) return cached;
    }
    const tagged = notes.find((n) => isScratchpadNote(n) && !n.deletedAt);
    return tagged ?? null;
  }, [notes, scratchpadNoteId]);

  // Keep client cache in sync when discovered from another device via sync
  useEffect(() => {
    if (scratchpadNote && scratchpadNote.id !== scratchpadNoteId) {
      setScratchpadNoteId(scratchpadNote.id);
    }
  }, [scratchpadNote, scratchpadNoteId, setScratchpadNoteId]);

  // Action: Create fresh scratchpad note (archived + tagged)
  const createScratchpad = useCallback(async (): Promise<Note> => {
    const note = await createNote({
      title: 'Scratchpad',
      content: '',
      tags: [SCRATCHPAD_TAG],
      isArchived: true,
    });
    setScratchpadNoteId(note.id);
    return note;
  }, [setScratchpadNoteId]);

  // Action: Assign an existing active or archived note as the scratchpad
  const assignExistingNote = useCallback(
    async (note: Note): Promise<void> => {
      const newTags = formatScratchpadTags(note.tags);
      await updateNote(note.id, {
        tags: newTags,
        isArchived: true,
      });
      setScratchpadNoteId(note.id);
    },
    [setScratchpadNoteId],
  );

  // Action: Reset scratchpad association without unarchiving
  const resetScratchpad = useCallback(async (): Promise<void> => {
    if (scratchpadNote) {
      const newTags = removeScratchpadTag(scratchpadNote.tags);
      await updateNote(scratchpadNote.id, {
        tags: newTags,
        isArchived: false,
      });
    }
    setScratchpadNoteId(null);
  }, [scratchpadNote, setScratchpadNoteId]);

  return {
    scratchpadNote,
    isInitialized: !!scratchpadNote,
    isLoading,
    createScratchpad,
    assignExistingNote,
    resetScratchpad,
  };
}
