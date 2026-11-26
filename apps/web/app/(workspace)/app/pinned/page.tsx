"use client";

import { useNotes } from "@/lib/api/notes.api";
import { NotesListView } from "@/components/workspace/notes/notes-list-view";

export default function PinnedNotesPage() {
  const { data: notes = [], isLoading, isError } = useNotes({ pinnedOnly: true });

  return (
    <NotesListView
      title="Pinned"
      subtitle="Quick access to your important notes"
      notes={notes}
      isLoading={isLoading}
      isError={isError}
      emptyTitle="No pinned notes"
      emptyDescription="Pin any note to keep it anchored here."
    />
  );
}
