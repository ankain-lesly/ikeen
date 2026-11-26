"use client";

import { useNotes } from "@/lib/api/notes.api";
import { NotesListView } from "@/components/workspace/notes/notes-list-view";

export default function ArchiveNotesPage() {
  const { data: notes = [], isLoading, isError } = useNotes({ archivedOnly: true });

  return (
    <NotesListView
      title="Archive"
      subtitle="Completed or tucked-away notes"
      notes={notes}
      isLoading={isLoading}
      isError={isError}
      pinnedFirst={false}
      emptyTitle="Archive is empty"
      emptyDescription="Archived notes will appear here out of your main list."
    />
  );
}
