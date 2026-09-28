import { useMemo, useState } from "react";
import {
  View,
} from "react-native";
import {
  useLiveNotes,
} from "@/lib/queries/notes";
import {
  createFolder,
  updateFolder,
} from "@/lib/queries/folders";
import type { ListNotesOptions } from "@/lib/types/notes";
import type { CreateFolderInput, FolderWithCount } from "@/lib/types/folders";
import { NotesHeader } from "@/components/notes/notes-header";
import { NotesFilterSheet } from "@/components/notes/notes-filter-sheet";
import { CreateFolderSheet } from "@/components/folders/create-folder-sheet";
import { NoteGridContainer } from "@/components/notes/notes-grid-container";
import { NoteEmptyCard } from "@/components/notes/note-empty-card";

export default function NotesScreen() {
  // Folder Sheets & Modals
  const [isCreateFolderSheetVisible, setIsCreateFolderSheetVisible] =
    useState(false);
  const [folderToEdit, setFolderToEdit] = useState<FolderWithCount | null>(
    null,
  );

  // Notes Filter State
  const [filter, setFilter] = useState<ListNotesOptions>({});
  const [isFilterSheetPresented, setIsFilterSheetPresented] = useState(false);

  // Reactive Queries
  const { data: rawNotes = [] } = useLiveNotes({
    ...filter,
  });

  // Extract unique available tags from notes
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    (rawNotes).forEach((n) => {
      try {
        const parsed = JSON.parse(n.tags || "[]");
        if (Array.isArray(parsed)) {
          parsed.forEach((t) => {
            const clean = String(t).trim().toLowerCase().replace(/^#/, "");
            if (clean) set.add(clean);
          });
        }
      } catch {}
    });
    return Array.from(set).sort();
  }, [rawNotes]);

  // Determine if any non-default filters or sorts are active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filter).some((key) =>
      Boolean(filter[key as keyof ListNotesOptions]),
    );
  }, [filter]);

  // Filter notes in memory
  const notes = useMemo(() => {
    const list = rawNotes ?? [];
    if (filter.pinnedFirst) {
      return list.filter((n) => n.isPinned && !n.isArchived);
    }
    if (filter.includeArchived) {
      return list.filter((n) => n.isArchived);
    }
    return list.filter((n) => !n.isArchived);
  }, [rawNotes, filter]);

  const handleSaveFolder = async (data: CreateFolderInput) => {
    if (folderToEdit) {
      await updateFolder(folderToEdit.id, data);
      setFolderToEdit(null);
    } else {
      await createFolder(data);
    }
  };

  const handleApplyFilters = (newFilter: ListNotesOptions) => {
    setFilter(newFilter);
    setIsFilterSheetPresented(false);
  };

  return (
    <View className="flex-1 bg-background pt-safe">
      {/*  Notes View Mode  */}
      <View className="flex-1">
        <NotesHeader
          filter={filter}
          onOpenFilter={() => setIsFilterSheetPresented(true)}
          hasActiveFilters={hasActiveFilters}
          updateFilter={(newFilter) => setFilter(newFilter)}
        />

        <NoteGridContainer
        filter={filter}
        updateFilter={(key,val) =>setFilter(prev=>({...prev,[key]: val}))}
          data={notes}
          empty={<NoteEmptyCard />}
          // empty={
          //   <View className="items-center justify-center py-20 px-8">
          //     <View className="w-16 h-16 rounded-full items-center justify-center bg-background-element mb-3">
          //       <FileText size={32} color={colors.textSecondary} />
          //     </View>
          //     <ThemedText className="font-semibold text-base text-text text-center">
          //       {Object.keys(filter).length > 0
          //         ? "No matching notes"
          //         : "No notes yet"}
          //     </ThemedText>
          //     <Text className="text-xs text-text-secondary text-center mt-1.5 leading-relaxed">
          //       {Object.keys(filter).length > 0
          //         ? "Try searching for a different keyword or tag."
          //         : "Capture your thoughts, ideas, and architecture notes."}
          //     </Text>
          //   </View>
          // }
        />
      </View>

      {/* Create / Edit Folder Modal Sheet */}
      <CreateFolderSheet
        isPresented={isCreateFolderSheetVisible}
        onDismiss={() => {
          setIsCreateFolderSheetVisible(false);
          setFolderToEdit(null);
        }}
        folderToEdit={folderToEdit}
        onSave={handleSaveFolder}
      />

      {/* Notes Filter Sheet */}
      <NotesFilterSheet
        isPresented={isFilterSheetPresented}
        onDismiss={() => setIsFilterSheetPresented(false)}
        availableTags={availableTags}
        handleApplyFilters={handleApplyFilters}
      />
    </View>
  );
}
