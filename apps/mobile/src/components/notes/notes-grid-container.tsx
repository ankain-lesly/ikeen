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
  bulkMoveNotesToFolder,
  bulkSetArchiveNotes,
  bulkSetPinNotes,
  bulkSoftDeleteNotes,
  hardDeleteNote,
  restoreNote,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
} from "@/lib/queries/notes";
import { ThemedText } from "../ui/themed-text";
import { toast } from "@/lib/toast";
import {
  NotesBulkActionBar,
  type NotesGridVariant,
} from "./notes-bulk-action-bar";
import { MoveToFolderSheet } from "./move-to-folder-sheet";

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

  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const isSelectionModeRef = useRef(isSelectionMode);
  isSelectionModeRef.current = isSelectionMode;

  useEffect(() => {
    const visibleIds = new Set(data.map((n) => n.id));
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (visibleIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [data]);

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

  // Selection Mode Handlers
  const handleSelectNote = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // When zero items remain selected, exit select mode
      if (next.size === 0) {
        setIsSelectionMode(false);
      }
      return next;
    });
  }, []);

  const handleLongPressSelect = useCallback((id: string) => {
    setIsSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const allSelected =
    data.length > 0 && data.every((n) => selectedIds.has(n.id));

  const handleToggleSelectAll = useCallback(() => {
    Haptics.selectionAsync();
    if (allSelected) {
      setSelectedIds(new Set());
      // When deselecting all (zero items selected), exit select mode
      setIsSelectionMode(false);
    } else {
      setSelectedIds(new Set(data.map((n) => n.id)));
    }
  }, [allSelected, data]);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Bulk Operations State
  const selectedNotes = useMemo(() => {
    return data.filter((n) => selectedIds.has(n.id));
  }, [data, selectedIds]);

  const isAllPinned = useMemo(() => {
    return selectedNotes.length > 0 && selectedNotes.every((n) => n.isPinned);
  }, [selectedNotes]);

  const isAllArchived = useMemo(() => {
    return selectedNotes.length > 0 && selectedNotes.every((n) => n.isArchived);
  }, [selectedNotes]);

  // Bulk Actions
  const handleBulkPin = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const targetPinState = !isAllPinned;
    try {
      await bulkSetPinNotes(ids, targetPinState);
      toast.success(
        targetPinState
          ? `Pinned ${ids.length} ${ids.length === 1 ? "note" : "notes"}`
          : `Unpinned ${ids.length} ${ids.length === 1 ? "note" : "notes"}`,
      );
      handleCancelSelection();
    } catch {
      Alert.alert("Error", "Could not update pin state for selected notes");
    }
  }, [selectedIds, isAllPinned, handleCancelSelection]);

  const handleBulkArchive = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const targetArchiveState = !isAllArchived;
    try {
      await bulkSetArchiveNotes(ids, targetArchiveState);
      toast.success(
        targetArchiveState
          ? `Archived ${ids.length} ${ids.length === 1 ? "note" : "notes"}`
          : `Unarchived ${ids.length} ${ids.length === 1 ? "note" : "notes"}`,
      );
      handleCancelSelection();
    } catch {
      Alert.alert("Error", "Could not update archive state for selected notes");
    }
  }, [selectedIds, isAllArchived, handleCancelSelection]);

  const handleBulkMoveToFolder = useCallback(
    async (folderId: string | null) => {
      const ids = Array.from(selectedIds);
      if (ids.length === 0) return;
      try {
        await bulkMoveNotesToFolder(ids, folderId);
        toast.success(
          `Moved ${ids.length} ${ids.length === 1 ? "note" : "notes"}`,
        );
        handleCancelSelection();
      } catch {
        Alert.alert("Error", "Could not move selected notes");
      }
    },
    [selectedIds, handleCancelSelection],
  );

  const handleBulkDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    Alert.alert(
      "Delete Notes",
      `Are you sure you want to move ${ids.length} ${ids.length === 1 ? "note" : "notes"} to recently deleted?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await bulkSoftDeleteNotes(ids);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              toast.success(
                `Deleted ${ids.length} ${ids.length === 1 ? "note" : "notes"}`,
              );
              handleCancelSelection();
            } catch {
              Alert.alert("Error", "Could not delete selected notes");
            }
          },
        },
      ],
    );
  }, [selectedIds, handleCancelSelection]);

  const handleBulkRestore = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await restoreNote(id);
      }
      toast.success(
        `Restored ${ids.length} ${ids.length === 1 ? "note" : "notes"}`,
      );
      handleCancelSelection();
    } catch {
      Alert.alert("Error", "Could not restore selected notes");
    }
  }, [selectedIds, handleCancelSelection]);

  const handleBulkHardDelete = useCallback(() => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    Alert.alert(
      "Delete Notes",
      `Permanently delete ${ids.length} ${ids.length === 1 ? "note" : "notes"}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              for (const id of ids) {
                await hardDeleteNote(id);
              }
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              toast.success(
                `Permanently deleted ${ids.length} ${ids.length === 1 ? "note" : "notes"}`,
              );
              handleCancelSelection();
            } catch {
              Alert.alert("Error", "Could not delete selected notes");
            }
          },
        },
      ],
    );
  }, [selectedIds, handleCancelSelection]);

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
          isSelectionMode={isSelectionModeRef.current}
          isSelected={selectedIdsRef.current.has(item.id)}
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
          currentFolderId={filter.folderId}
          onSelectFolder={handleBulkMoveToFolder}
        />
      )}
    </View>
  );
});
