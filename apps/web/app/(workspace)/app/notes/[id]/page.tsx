"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useNote } from "@/lib/api/notes.api";
import { NoteEditor } from "@/components/workspace/notes/note-editor";
import { Skeleton } from "@/components/ui/skeleton";

export default function NoteDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: note, isLoading, isError } = useNote(params.id);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8 space-y-6">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !note) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 text-center space-y-3">
        <h1 className="font-heading text-lg font-semibold text-foreground">
          Note not found
        </h1>
        <p className="text-xs text-muted-foreground">
          This note may have been deleted or does not belong to your account.
        </p>
        <Link
          href="/app/notes"
          className="inline-block text-xs font-medium text-primary hover:underline"
        >
          ← Back to All Notes
        </Link>
      </div>
    );
  }

  return <NoteEditor note={note} />;
}
