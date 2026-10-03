import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Grid2X2,
  List,
} from "lucide-react-native";
import { FlashList } from "@shopify/flash-list";
import type { ListNotesOptions, Note } from "@/lib/types/notes";

import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import { BottomTabInset } from "@/constants/theme";
import { NoteCard } from "./note-card";
import {
  applyToNotes,
  hardDeleteNote,
  restoreNote,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  updateNote,
} from "@/lib/queries/notes";
import { ThemedText } from "../ui/themed-text";
import { toast } from "@/lib/toast";
import {
  NotesBulkActionBar,
  type NotesGridVariant,
} from "./notes-bulk-action-bar";
import { MoveToFolderSheet } from "./move-to-folder-sheet";

function noteLabel(count: number) {
  return count === 1 ? "note" : "notes";
}

interface NoteGridContainerProps {
  data: Note[];
  empty?: React.ReactElement;
  footer?: React.ReactElement;
  showFilter?: boolean;
  className?: string;
  variant?: NotesGridVariant;
  updateFilter: (key: keyof ListNotesOptions, value: any) => void;
  filter: ListNotesOptions;
}

export const NoteGridContainer = React.memo(function NoteGridContainer({
  data,
  showFilter = true,
  empty,
  filter,
  updateFilter,
  footer,
  className,
  variant = "default",
}: NoteGridContainerProps) {
  const colors = useTheme();
  const isTrash = variant === "trash";

  const [gridLayout, setGridLayout] = useState<"grid" | "list">("grid");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoveSheetVisible, setIsMoveSheetVisible] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visibleIds = new Set(data.map((n) => n.id));
    const next = new Set<string>();
    for (const id of selectedIds) {
      if (visibleIds.has(id)) next.add(id);
    }
    if (next.size === selectedIds.size) return;
    setSelectedIds(next);
    if (next.size === 0) setIsSelectionMode(false);
  }, [data, selectedIds]);

  // Single Note Handlers
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

  const handleSelectNote = useCallback((id: string) => {
    const removingLast = selectedIds.has(id) && selectedIds.size === 1;
    if (removingLast) setIsSelectionMode(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, [selectedIds]);

  const handleLongPressSelect = useCallback((id: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectedNotes = useMemo(
    () => data.filter((n) => selectedIds.has(n.id)),
    [data, selectedIds],
  );

  const allSelected =
    data.length > 0 && selectedNotes.length === data.length;
  const isAllPinned =
    selectedNotes.length > 0 && selectedNotes.every((n) => n.isPinned);
  const isAllArchived =
    selectedNotes.length > 0 && selectedNotes.every((n) => n.isArchived);
  const sharedFolderId = useMemo(() => {
    if (selectedNotes.length === 0) return undefined;
    const first = selectedNotes[0].folderId ?? null;
    return selectedNotes.every((n) => (n.folderId ?? null) === first)
      ? first
      : undefined;
  }, [selectedNotes]);

  const handleToggleSelectAll = useCallback(() => {
    Haptics.selectionAsync();
    if (allSelected) {
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(data.map((n) => n.id)));
    }
  }, [allSelected, data]);

  const finishBulk = useCallback(
    (
      succeeded: string[],
      failed: string[],
      successMessage: (count: number) => string,
      errorMessage: string,
    ) => {
      if (succeeded.length > 0) toast.success(successMessage(succeeded.length));
      if (failed.length > 0) {
        Alert.alert("Error", errorMessage);
        setSelectedIds(new Set(failed));
        return;
      }
      handleCancelSelection();
    },
    [handleCancelSelection],
  );

  const runBulk = useCallback(
    async (
      apply: (id: string) => Promise<unknown>,
      successMessage: (count: number) => string,
      errorMessage: string,
    ) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0 || busyRef.current) return;
      busyRef.current = true;
      try {
        const { succeeded, failed } = await applyToNotes(ids, apply);
        finishBulk(succeeded, failed, successMessage, errorMessage);
      } finally {
        busyRef.current = false;
      }
    },
    [selectedIds, finishBulk],
  );

  const handleBulkPin = useCallback(() => {
    const pin = !isAllPinned;
    void runBulk(
      (id) => updateNote(id, { isPinned: pin }),
      (n) => `${pin ? "Pinned" : "Unpinned"} ${n} ${noteLabel(n)}`,
      "Could not update pin state for selected notes",
    );
  }, [isAllPinned, runBulk]);

  const handleBulkArchive = useCallback(() => {
    const archived = !isAllArchived;
    void runBulk(
      (id) => updateNote(id, { isArchived: archived }),
      (n) => `${archived ? "Archived" : "Unarchived"} ${n} ${noteLabel(n)}`,
      "Could not update archive state for selected notes",
    );
  }, [isAllArchived, runBulk]);

  const handleBulkMoveToFolder = useCallback(
    (folderId: string | null) =>
      runBulk(
        (id) => updateNote(id, { folderId }),
        (n) => `Moved ${n} ${noteLabel(n)}`,
        "Could not move selected notes",
      ),
    [runBulk],
  );

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    Alert.alert(
      "Delete Notes",
      `Are you sure you want to move ${ids.length} ${noteLabel(ids.length)} to recently deleted?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            void runBulk(
              softDeleteNote,
              (n) => `Deleted ${n} ${noteLabel(n)}`,
              "Could not delete selected notes",
            );
          },
        },
      ],
    );
  }, [selectedIds, runBulk]);

  const handleBulkRestore = useCallback(() => {
    void runBulk(
      restoreNote,
      (n) => `Restored ${n} ${noteLabel(n)}`,
      "Could not restore selected notes",
    );
  }, [runBulk]);

  const handleBulkHardDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    Alert.alert(
      "Delete Notes",
      `Permanently delete ${ids.length} ${noteLabel(ids.length)}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            void runBulk(
              hardDeleteNote,
              (n) => `Permanently deleted ${n} ${noteLabel(n)}`,
              "Could not delete selected notes",
            );
          },
        },
      ],
    );
  }, [selectedIds, runBulk]);

  const extraData = useMemo(
    () => ({ isSelectionMode, selectedIds }),
    [isSelectionMode, selectedIds],
  );

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <View className="p-1">
        <NoteCard
          note={item}
          onTogglePin={handleTogglePin}
          onToggleArchive={handleToggleArchive}
          onDelete={handleDeleteNote}
          isSelectionMode={isSelectionMode}
          isSelected={selectedIds.has(item.id)}
          onSelect={handleSelectNote}
          onLongPressSelect={handleLongPressSelect}
        />
      </View>
    ),
    [
      handleTogglePin,
      handleToggleArchive,
      handleDeleteNote,
      handleSelectNote,
      handleLongPressSelect,
      isSelectionMode,
      selectedIds,
    ],
  );

  // Filters
  const handleToggleSortDirection = () => {
    Haptics.selectionAsync();
    updateFilter(
      "orderDirection",
      filter.orderDirection === "asc" ? "desc" : "asc",
    );
  };

  const handleCycleFolderSort = () => {
    Haptics.selectionAsync();
    updateFilter(
      "orderBy",
      filter.orderBy === "updatedAt"
        ? "title"
        : filter.orderBy === "title"
          ? "createdAt"
          : "updatedAt",
    );
  };

  return (
    <View className={`flex-1 relative ${className || ""}`}>
      {/* Fixed-height toolbar placed outside FlashList to prevent any masonry jitter */}
      {!!data.length && (
        <View className="h-11 flex-row items-center justify-between px-3.5 mb-1">
          {isSelectionMode ? (
            /* Selection Mode Toolbar */
            <View className="flex-1 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Done selection"
                  onPress={handleCancelSelection}
                  hitSlop={8}
                  className="px-2.5 py-1.5 rounded-lg bg-background-element active:opacity-70">
                  <Text className="text-sm font-semibold text-text">Done</Text>
                </Pressable>
                <Text className="text-sm font-medium text-text-secondary">
                  {selectedNotes.length} of {data.length} selected
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  allSelected ? "Deselect all notes" : "Select all notes"
                }
                onPress={handleToggleSelectAll}
                hitSlop={8}
                className="px-2.5 py-1.5 rounded-lg bg-background-element active:opacity-70">
                <Text className="text-sm font-semibold text-primary">
                  {allSelected ? "Deselect All" : "Select All"}
                </Text>
              </Pressable>
            </View>
          ) : (
            /* Normal Mode Toolbar */
            <View className="flex-1 flex-row items-center justify-between">
              {showFilter ? (
                <View className="flex-row items-center gap-1.5">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      filter.orderDirection === "desc"
                        ? "Sort descending, tap to reverse"
                        : "Sort ascending, tap to reverse"
                    }
                    onPress={handleToggleSortDirection}
                    hitSlop={8}
                    className="min-h-11 min-w-11 items-center justify-center">
                    {filter.orderDirection === "desc" ? (
                      <ArrowDownWideNarrow size={17} color={colors.text} />
                    ) : (
                      <ArrowUpNarrowWide size={17} color={colors.text} />
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Change sort field"
                    onPress={handleCycleFolderSort}
                    className="flex-row items-center min-h-11 active:opacity-70">
                    <Text className="text-sm font-semibold text-text">
                      {filter.orderBy === "updatedAt"
                        ? "Last modified"
                        : filter.orderBy === "title"
                          ? "Title"
                          : "Date created"}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <ThemedText type="subtitle">
                  {isTrash ? "Recently deleted" : "Notes"}
                </ThemedText>
              )}

              {/* Actions Right: Select Mode & Grid/List Toggle */}
              <View className="flex-row items-center gap-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Enter selection mode"
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIsSelectionMode(true);
                  }}
                  hitSlop={8}
                  className="h-8 px-2.5 rounded-lg items-center justify-center bg-background-element active:bg-background-selected">
                  <Text className="text-xs font-semibold text-text">Select</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    gridLayout === "grid"
                      ? "Switch to list view"
                      : "Switch to grid view"
                  }
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGridLayout((prev) =>
                      prev === "grid" ? "list" : "grid",
                    );
                  }}
                  hitSlop={8}
                  className="min-h-11 min-w-11 rounded-lg items-center justify-center active:bg-background-element">
                  {gridLayout === "grid" ? (
                    <Grid2X2 size={20} color={colors.text} />
                  ) : (
                    <List size={20} color={colors.text} />
                  )}
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}

      <FlashList
        data={data}
        numColumns={gridLayout === "grid" ? 2 : 1}
        masonry={gridLayout === "grid"}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={extraData}
        className="flex-1"
        contentContainerClassName="pt-1 px-2.5"
        contentContainerStyle={{
          paddingBottom: BottomTabInset + 80,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
      />

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && (
        <NotesBulkActionBar
          variant={variant}
          selectedCount={selectedNotes.length}
          isAllPinned={isAllPinned}
          isAllArchived={isAllArchived}
          onPin={handleBulkPin}
          onMove={() => setIsMoveSheetVisible(true)}
          onArchive={handleBulkArchive}
          onDelete={handleBulkDelete}
          onRestore={handleBulkRestore}
          onHardDelete={handleBulkHardDelete}
          onCancel={handleCancelSelection}
        />
      )}

      {/* Move to Folder Sheet */}
      {!isTrash && (
        <MoveToFolderSheet
          isPresented={isMoveSheetVisible}
          onDismiss={() => setIsMoveSheetVisible(false)}
          currentFolderId={sharedFolderId}
          onSelectFolder={handleBulkMoveToFolder}
        />
      )}
    </View>
  );
});
