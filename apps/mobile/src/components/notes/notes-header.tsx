import React from "react";
import { View, Pressable, Text, ScrollView } from "react-native";
import { type Href, useRouter } from "expo-router";
import {
  FolderIcon,
  ListOrdered,
  Pin,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "../ui/themed-text";
import { ListNotesOptions } from "@/lib/types/notes";
import * as Haptics from "expo-haptics";
import {  } from "react-native";

interface NotesHeaderProps {
  onOpenFilter: () => void;
  filter: ListNotesOptions;
  hasActiveFilters: boolean;
  updateFilter: (filter: ListNotesOptions) => void;
}

export function NotesHeader({
  onOpenFilter,
  filter,
  hasActiveFilters,
  updateFilter,
}: NotesHeaderProps) {
  const router = useRouter();
  const colors = useTheme();

  const handleNavigateSearch = () => {
    router.push("/search" as Href);
  };

  const handleNavigateAI = () => {
    router.push("/agent");
  };

  const isRecentActive = !filter.pinnedOnly && !filter.includeArchived && !filter.archivedOnly;
  const isPinnedActive = filter.pinnedOnly === true;
  const isArchivedActive = filter.archivedOnly === true || (filter.includeArchived === true && !filter.pinnedOnly);

  const applyView = (view: {
    pinnedOnly: boolean;
    includeArchived: boolean;
    archivedOnly: boolean;
  }) => {
    updateFilter({
      ...filter,
      pinnedOnly: view.pinnedOnly,
      includeArchived: view.includeArchived,
      archivedOnly: view.archivedOnly,
    });
  };

  return (
    <View className="border-b border-border/50 bg-background pb-3">
      {/* TOp Header */}
      <View className="flex-row items-center justify-between px-4">
        {/* Title */}
        <ThemedText type="title">My Notes</ThemedText>

        {/* Action Cluster: Search -> Filter -> AI */}
        <View className="flex-row items-center gap-2">
          {/* Search Navigation Trigger */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search notes"
            hitSlop={8}
            onPress={handleNavigateSearch}
            className="h-11 w-11 items-center justify-center rounded-full active:bg-background-selected">
            <Search size={20} color={colors.text} strokeWidth={2} />
          </Pressable>

          {/* Filter Modal Trigger */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter and sort notes"
            hitSlop={8}
            onPress={onOpenFilter}
            className="relative h-11 w-11 items-center justify-center rounded-full active:bg-background-selected">
            <SlidersHorizontal size={20} color={colors.text} strokeWidth={2} />
            {hasActiveFilters && (
              <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </Pressable>

          {/* AI Agent Navigation Trigger */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AI agent"
            hitSlop={8}
            onPress={handleNavigateAI}
            className="h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-primary/10 active:bg-primary/20">
            <Sparkles size={20} color={colors.primary} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {/* Segmented Filter Pills */}
      <View className="flex-row items-center justify-between gap-2 px-4">
        <ScrollView
          className="flex-row gap-2"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recent notes"
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
              isRecentActive
                ? "bg-foreground border-foreground"
                : "bg-background-element border-border"
            }`}
            onPress={() => {
              applyView({ pinnedOnly: false, includeArchived: false, archivedOnly: false });
            }}>
            <ListOrdered
              size={12}
              color={isRecentActive ? colors.background : colors.textSecondary}
            />
            <ThemedText
              className={`text-xs ${
                isRecentActive
                  ? "text-background font-semibold"
                  : "text-text-secondary font-normal"
              }`}>
              Recent
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pinned notes"
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
              isPinnedActive
                ? "bg-foreground border-foreground"
                : "bg-background-element border-border"
            }`}
            onPress={() => {
              applyView({ pinnedOnly: true, includeArchived: false, archivedOnly: false });
            }}>
            <Pin
              size={12}
              color={isPinnedActive ? colors.background : colors.textSecondary}
            />
            <ThemedText
              className={`text-xs ${
                isPinnedActive
                  ? "text-background font-semibold"
                  : "text-text-secondary font-normal"
              }`}>
              Pinned
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Archived notes"
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
              isArchivedActive
                ? "bg-foreground border-foreground"
                : "bg-background-element border-border"
            }`}
            onPress={() => {
              applyView({ pinnedOnly: false, includeArchived: true, archivedOnly: true });
            }}>
            <ThemedText
              className={`text-xs ${
                isArchivedActive
                  ? "text-background font-semibold"
                  : "text-text-secondary font-normal"
              }`}>
              Archived
            </ThemedText>
          </Pressable>
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open folders"
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(tabs)/notes/folders");
          }}
          className={`flex-row items-center gap-1.5 px-3 py-1 rounded-lg min-h-11`}>
          <FolderIcon size={16} color={colors.primary} />
          <Text className={`text-sm font-semibold text-primary`}>Folders</Text>
        </Pressable>
      </View>
    </View>
  );
}
