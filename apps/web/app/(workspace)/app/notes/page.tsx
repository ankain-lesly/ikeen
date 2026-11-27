"use client";

import * as React from "react";
import { Archive, FileText, Pin } from "lucide-react";
import { useNotes, type NotesFilter } from "@/lib/api/notes.api";
import { NotesListView } from "@/components/workspace/notes/notes-list-view";

type NotesTab = "all" | "pinned" | "archived";

const FILTER_TABS: Array<{
  id: NotesTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "all", label: "All", icon: FileText },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "archived", label: "Archived", icon: Archive },
];

export default function AllNotesPage() {
  const [activeTab, setActiveTab] = React.useState<NotesTab>("all");

  const filter: NotesFilter = React.useMemo(() => {
    if (activeTab === "pinned") return { pinnedOnly: true };
    if (activeTab === "archived") return { archivedOnly: true };
    return {};
  }, [activeTab]);

  const { data: notes = [], isLoading, isError } = useNotes(filter);

  const emptyCopy =
    activeTab === "pinned"
      ? {
          title: "No pinned notes",
          description: "Pin any note to keep it anchored at the top.",
        }
      : activeTab === "archived"
        ? {
            title: "No archived notes",
            description: "Archived notes will appear here out of your active view.",
          }
        : {
            title: "No notes yet",
            description: "Create your first note to start writing.",
          };

  return (
    <NotesListView
      title="Notes"
      subtitle={`${notes.length} ${activeTab === "all" ? "active" : activeTab} ${notes.length === 1 ? "note" : "notes"}`}
      notes={notes}
      isLoading={isLoading}
      isError={isError}
      pinnedFirst={activeTab !== "archived"}
      emptyTitle={emptyCopy.title}
      emptyDescription={emptyCopy.description}
      filterBar={
        <div
          role="tablist"
          aria-label="Filter notes"
          className="inline-flex items-center gap-1 p-1"
        >
          {FILTER_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      }
    />
  );
}
