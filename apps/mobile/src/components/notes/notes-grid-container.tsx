import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Check,
  Grid2X2,
  Rows2,
} from "lucide-react-native";
import { FlashList } from "@shopify/flash-list";
import type { ListNotesOptions, NoteWithBlocks } from "@/lib/types/notes";

import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import { BottomTabInset } from "@/constants/theme";
import { NoteCard } from "./note-card";
import {
  applyToNotes,
  hardDeleteNote,
  restoreNote,
  softDeleteNote,
  updateNote,
} from "@/lib/queries/notes";
import { ThemedText } from "../ui/themed-text";
import { toast } from "@/lib/toast";
import {
  NotesBulkActions,
  type NotesGridVariant,
} from "./notes-bulk-action-bar";
import { MoveToFolderSheet } from "./move-to-folder-sheet";
import { ReminderSheet } from "./reminder-sheet";
import { batchCreateReminders } from "@/lib/queries/reminders";
import type { ReminderRepeat } from "@repo/types";
import { AnimatedEntryView } from "../ui/animated";
import { Card } from "../ui/card";
import { HeaderGradient } from "@/hooks/use-header-inset";

function noteLabel(count: number) {
  return count === 1 ? "note" : "notes";
}

interface NoteGridContainerProps {
  data: NoteWithBlocks[];
  empty?: React.ReactElement;
  footer?: React.ReactElement;
  showFilter?: boolean;
  className?: string;
  variant?: NotesGridVariant;
  updateFilter?: (key: keyof ListNotesOptions, value: any) => void;
  filter?: ListNotesOptions;
  contentStyle?: ViewStyle;
  hideControls?: boolean;
  header?: React.ReactElement;
}

export const NoteGridContainer = React.memo(function NoteGridContainer({
  data,
  showFilter = true,
  empty,
  filter = {},
  updateFilter,
  footer,
  className,
  variant = "default",
  contentStyle,
  hideControls = false,
  header,
}: NoteGridContainerProps) {
  const colors = useTheme();
  const isTrash = variant === "trash";

  const [gridLayout, setGridLayout] = useState<"grid" | "list">("grid");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoveSheetVisible, setIsMoveSheetVisible] = useState(false);
  const [isReminderSheetVisible, setIsReminderSheetVisible] = useState(false);
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

  const handleSelectNote = useCallback(
    (id: string) => {
      const removingLast = selectedIds.has(id) && selectedIds.size === 1;
      if (removingLast) setIsSelectionMode(false);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [selectedIds],
  );

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

  const allSelected = data.length > 0 && selectedNotes.length === data.length;
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

  const resetSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    Haptics.selectionAsync();
    if (allSelected) {
      resetSelection();
    } else {
      setSelectedIds(new Set(data.map((n) => n.id)));
    }
  }, [allSelected, data, resetSelection]);

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
      (n) => `${archived ? "Archived" : "Un archived"} ${n} ${noteLabel(n)}`,
      "Could not update archive state for selected notes",
    );
  }, [isAllArchived, runBulk]);

  const handleBulkReminder = useCallback(
    async (dueAt: string, repeat: ReminderRepeat) => {
      const count = selectedNotes.length;
      if (count === 0) return;
      try {
        await batchCreateReminders(
          selectedNotes.map((n) => n.id),
          { title: '', dueAt, repeat }
        );
        toast.success(
          count === 1 ? "Reminder set for note" : `Reminders set for ${count} notes`
        );
        handleCancelSelection();
      } catch (err) {
        toast.error("Failed to set reminders");
      }
    },
    [selectedNotes, handleCancelSelection]
  );

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
    () => ({ isSelectionMode, selectedIds, gridLayout }),
    [isSelectionMode, selectedIds, gridLayout],
  );

  const renderItem = useCallback(
    ({ item }: { item: NoteWithBlocks }) => (
      <View className="p-1">
        <NoteCard
          note={item}
          layout={gridLayout}
          isSelectionMode={isSelectionMode}
          isSelected={selectedIds.has(item.id)}
          onSelect={handleSelectNote}
          onLongPressSelect={handleLongPressSelect}
        />
      </View>
    ),
    [
      handleSelectNote,
      handleLongPressSelect,
      isSelectionMode,
      selectedIds,
      gridLayout,
    ],
  );

  // Filters
  const handleToggleSortDirection = () => {
    Haptics.selectionAsync();
    updateFilter?.(
      "orderDirection",
      filter.orderDirection === "asc" ? "desc" : "asc",
    );
  };

  const handleCycleFolderSort = () => {
    Haptics.selectionAsync();
    updateFilter?.(
      "orderBy",
      filter.orderBy === "updatedAt"
        ? "title"
        : filter.orderBy === "title"
          ? "createdAt"
          : "updatedAt",
    );
  };

  // Optionally, usePreventRemove -> Available Only on Expo SDK 58
  useEffect(() => {
    const backAction = () => {
      if (isSelectionMode) {
        resetSelection();
      }
      return !!isSelectionMode; // Return true to prevent default back behavior, or false to let it go back
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );

    return () => backHandler.remove();
  }, [isSelectionMode, resetSelection]);

  const headerHeight = hideControls ? 0 : 46;
  const headerComponent = () => {
    if (hideControls) return null;
    return (
      <>
        {!!data.length && (
          <View
            className="flex-row items-center justify-between px-3.5 absolute top-0 w-full z-10"
            style={{ height: headerHeight }}>
            <HeaderGradient featherOffset={2} colors={[colors.background, colors.background, "transparent"]} locations={[0.0,0.35,1]} />

            {isSelectionMode ? (
              /* Selection Mode Toolbar */
              <AnimatedEntryView className="flex-1 flex-row items-center justify-between px-2">
                <View className="flex-row items-center gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Done selection"
                    onPress={handleToggleSelectAll}
                    hitSlop={8}
                    className={`items-center justify-center size-6 border-2 rounded-lg ${allSelected ? "border-primary bg-primary" : "border-foreground/60"}`}>
                    {allSelected && (
                      <Check size={16} color="#ffffff" strokeWidth={3} />
                    )}
                  </Pressable>

                  <Text className="text-sm font-semibold text-text">
                    {selectedNotes.length} Selected
                  </Text>
                </View>

                <NotesBulkActions
                  variant={variant}
                  selectedCount={selectedNotes.length}
                  isAllPinned={isAllPinned}
                  isAllArchived={isAllArchived}
                  onPin={handleBulkPin}
                  onReminder={() => setIsReminderSheetVisible(true)}
                  onMove={() => setIsMoveSheetVisible(true)}
                  onArchive={handleBulkArchive}
                  onDelete={handleBulkDelete}
                  onRestore={handleBulkRestore}
                  onHardDelete={handleBulkHardDelete}
                  onCancel={handleCancelSelection}
                />
              </AnimatedEntryView>
            ) : (
              /* Normal Mode Toolbar */
              <AnimatedEntryView className="flex-1 flex-row items-center justify-between">
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
                      className="flex-row items-center min-h-11">
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
                    {/* {isTrash ? "Recently deleted" : "Notes"} */}
                    Notes
                  </ThemedText>
                )}

                {/* Actions Right: Select Mode & Grid/List Two-Button Layout */}
                <Card className="px-2 py-1.5 rounded-full flex-row items-center gap-3">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="List view"
                    accessibilityState={{ selected: gridLayout === "list" }}
                    onPress={() => {
                      if (gridLayout !== "list") {
                        Haptics.selectionAsync();
                        setGridLayout("list");
                      }
                    }}
                    hitSlop={4}>
                    <Rows2
                      size={20}
                      color={
                        gridLayout === "list"
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Grid view"
                    accessibilityState={{ selected: gridLayout === "grid" }}
                    onPress={() => {
                      if (gridLayout !== "grid") {
                        Haptics.selectionAsync();
                        setGridLayout("grid");
                      }
                    }}
                    hitSlop={4}>
                    <Grid2X2
                      size={20}
                      color={
                        gridLayout === "grid"
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </Pressable>
                </Card>
              </AnimatedEntryView>
            )}
          </View>
        )}
      </>
    );
  };
  return (
    <View className={`flex-1 relative ${className || ""}`}>
      {/* Fixed-height toolbar placed outside FlashList to prevent any masonry jitter */}
      {headerComponent()}
      {/* Notes Grid */}
      <FlashList
        data={data}
        ListHeaderComponent={<View>{header}</View>}
        numColumns={gridLayout === "grid" ? 2 : 1}
        masonry={gridLayout === "grid"}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        extraData={extraData}
        className="flex-1"
        contentContainerStyle={{
          ...StyleSheet.flatten(contentStyle),
          paddingTop:
            (Number(StyleSheet.flatten(contentStyle)?.paddingTop) || 0) +
            headerHeight,
          // paddingHorizontal: header ? 10 : 0,
          paddingHorizontal: 10,
          paddingBottom: BottomTabInset + 80,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
      />

            {/* Reminder Sheet */}
      {!isTrash && (
        <ReminderSheet
          isPresented={isReminderSheetVisible}
          onDismiss={() => setIsReminderSheetVisible(false)}
          targetCount={selectedNotes.length}
          onSave={handleBulkReminder}
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
