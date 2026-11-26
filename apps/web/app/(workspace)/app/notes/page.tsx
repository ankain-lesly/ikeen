"use client";

import { useNotes } from "@/lib/api/notes.api";
import { NotesListView } from "@/components/workspace/notes/notes-list-view";

export default function AllNotesPage() {
  const { data: notes = [], isLoading, isError } = useNotes();

  return (
    <NotesListView
      title="All Notes"
      subtitle={`${notes.length} active ${notes.length === 1 ? "note" : "notes"}`}
      notes={notes}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
