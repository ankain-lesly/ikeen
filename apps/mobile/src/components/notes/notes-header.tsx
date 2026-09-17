import React from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ListOrdered, Pin, Search, SlidersHorizontal, Sparkles } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "../ui/themed-text";
import { ListNotesOptions } from "@/lib/types/notes";

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
    router.push("/(tabs)/agent" as any);
  };

  const isAllActive = !(filter?.pinnedFirst || filter?.includeArchived);

  return (
    <View className="border-b border-border bg-background pb-3">
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
      <View className="flex-row gap-2 px-4">
        <Pressable
          key="all"
          className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border active:opacity-80 ${
            isAllActive ? "bg-background-selected border-primary"
              : "bg-background-element border-border"
          }`}
          onPress={() => {
            updateFilter({ pinnedFirst: false, includeArchived: false });
          }}>
          <ListOrdered size={12} color={isAllActive ? colors.primary : colors.textSecondary} />
          <ThemedText
            className={`text-xs ${
              isAllActive
                ? "text-text font-semibold"
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
              className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border active:opacity-80 ${
                isActive
                  ? "bg-background-selected border-primary"
                  : "bg-background-element border-border"
              }`}
              onPress={() => {
                updateFilter({ [mode]: !filter[mode] });
              }}>
              {mode === "pinnedFirst" && (
                <Pin
                  size={12}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
              )}
              <ThemedText
                className={`text-xs ${
                  isActive
                    ? "text-text font-semibold"
                    : "text-text-secondary font-normal"
                }`}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
