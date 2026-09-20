import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  FileText,
} from "lucide-react-native";

import { NoteCard } from "@/components/notes/note-card";
import { ThemedText } from "@/components/ui/themed-text";
import { BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  createNote,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  useLiveNotes,
} from "@/lib/queries/notes";
import {
  createFolder,
  softDeleteFolder,
  updateFolder,
  useLiveFolders,
} from "@/lib/queries/folders";
import type { ListNotesOptions, Note } from "@/lib/types/notes";
import type { CreateFolderInput, FolderWithCount } from "@/lib/types/folders";
import { NotesHeader } from "@/components/notes/notes-header";
import { NotesFilterSheet } from "@/components/notes/notes-filter-sheet";
import { SpeedDialFAB } from "@/components/folders/speed-dial-fab";
import { CreateFolderSheet } from "@/components/folders/create-folder-sheet";

export default function NotesScreen() {
  const colors = useTheme();

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

  // Note Handlers
  const handleTogglePin = useCallback(async (id: string) => {
    try {
      await togglePinNote(id);
    } catch {
      Alert.alert("Error", "Could not update pin state");
    }
  }, []);

  const handleToggleArchive = useCallback(async (id: string) => {
    try {
      await toggleArchiveNote(id);
    } catch {
      Alert.alert("Error", "Could not update archive state");
    }
  }, []);

  const handleDeleteNote = useCallback((id: string) => {
    Alert.alert(
      "Delete Note",
      "Are you sure you want to move this note to recently deleted?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await softDeleteNote(id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
            } catch {
              Alert.alert("Error", "Could not delete note");
            }
          },
        },
      ],
    );
  }, []);

  // const handleNewNote = async () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //   try {
  //     const newNote = await createNote();
  //     router.push({
  //       pathname: "/notes/[id]",
  //       params: { id: newNote.id },
  //     });
  //   } catch {
  //     Alert.alert("Error", "Failed to create new note");
  //   }
  // };

  const handleApplyFilters = (newFilter: ListNotesOptions) => {
    setFilter(newFilter);
    setIsFilterSheetPresented(false);
  };

  const renderNoteItem = useCallback(
    ({ item }: { item: Note }) => (
      <View className="w-1/2 p-1">
        <NoteCard
          note={item}
          onTogglePin={handleTogglePin}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDeleteNote}
        />
      </View>
    ),
    [handleTogglePin, handleToggleArchive, handleDeleteNote],
  );

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

        <FlatList
          data={notes}
          numColumns={2}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerClassName="pt-1 px-2.5"
          contentContainerStyle={{
            paddingBottom: BottomTabInset + 80,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-8">
              <View className="w-16 h-16 rounded-full items-center justify-center bg-background-element mb-3">
                <FileText size={32} color={colors.textSecondary} />
              </View>
              <ThemedText className="font-semibold text-base text-text text-center">
                {Object.keys(filter).length > 0
                  ? "No matching notes"
                  : "No notes yet"}
              </ThemedText>
              <Text className="text-xs text-text-secondary text-center mt-1.5 leading-relaxed">
                {Object.keys(filter).length > 0
                  ? "Try searching for a different keyword or tag."
                  : "Capture your thoughts, ideas, and architecture notes."}
              </Text>
            </View>
          }
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
