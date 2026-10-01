import React, { useCallback, useState } from "react";
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
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
} from "@/lib/queries/notes";
import { ThemedText } from "../ui/themed-text";

interface NoteCardProps {
  data: Note[];
  empty?: React.ReactElement;
  footer?: React.ReactElement;
  showFilter?: boolean;
  className?: string;
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
}: NoteCardProps) {
  const colors = useTheme();

  const [gridLayout, setGridLayout] = useState<"grid" | "list">("grid");

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

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <View className="p-1">
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
    <>
      <FlashList
        data={data}
        numColumns={gridLayout === "grid" ? 2 : 1}
        masonry={gridLayout === "grid"}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerClassName="pt-1 px-2.5"
        contentContainerStyle={{
          paddingBottom: BottomTabInset + 80,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {!!data.length ? (
              <View className="flex-row items-center justify-between pb-3 pt-1">
                {/* Sort Dropdown / Cycle button */}
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
                  <ThemedText type="subtitle" className="pl-2">
                    Notes
                  </ThemedText>
                )}

                {/* Grid vs List View Toggle */}
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
            ) : null}
          </>
        }
        ListEmptyComponent={empty}
      />
    </>
  );
});
