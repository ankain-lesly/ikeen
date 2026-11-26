import Link from "next/link";
import { StickyNote } from "lucide-react";

export default function ScratchpadPlaceholderPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-center space-y-3">
      <StickyNote className="size-8 text-primary mx-auto" />
      <h1 className="font-heading text-xl font-bold text-foreground">
        Scratchpad
      </h1>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
        Cross-device Scratchpad quick capture is scheduled for Phase 4.
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
