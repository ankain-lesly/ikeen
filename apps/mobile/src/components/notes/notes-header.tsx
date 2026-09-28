import React from "react";
import { View, Pressable, Text } from "react-native";
import { useRouter } from "expo-router";
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
import { ScrollView } from "react-native";

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
    router.push("/search" as any);
  };

  const handleNavigateAI = () => {
    router.push("/agent");
  };

  const isAllActive = !(filter?.pinnedFirst || filter?.includeArchived);

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
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
              isAllActive
                ? "bg-foreground border-foreground"
                : "bg-background-element border-border"
            }`}
            onPress={() => {
              updateFilter({ pinnedFirst: false, includeArchived: false });
            }}>
            <ListOrdered
              size={12}
              color={isAllActive ? colors.background : colors.textSecondary}
            />
            <ThemedText
              className={`text-xs ${
                isAllActive
                  ? "text-background font-semibold"
                  : "text-text-secondary font-normal"
              }`}>
              All
            </ThemedText>
          </Pressable>
          {(["pinnedFirst", "includeArchived"] as const).map((mode) => {
            const isActive = filter[mode] === true;

            const label = mode === "pinnedFirst" ? "Pinned" : "Archived";
            return (
              <Pressable
                key={mode}
                className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
                  isActive
                    ? "bg-foreground border-foreground"
                    : "bg-background-element border-border"
                }`}
                onPress={() => {
                  updateFilter({ [mode]: !filter[mode] });
                }}>
                {mode === "pinnedFirst" && (
                  <Pin
                    size={12}
                    color={isActive ? colors.background : colors.textSecondary}
                  />
                )}
                <ThemedText
                  className={`text-xs ${
                    isActive
                      ? "text-background font-semibold"
                      : "text-text-secondary font-normal"
                  }`}>
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(tabs)/notes/folders");
          }}
          className={`flex-row items-center gap-1.5 px-3 py-1 rounded-lg __bg-card`}>
          <FolderIcon size={16} color={colors.primary} />
          <Text className={`text-sm font-semibold text-primary`}>Folders</Text>
        </Pressable>
      </View>
    </View>
  );
}
