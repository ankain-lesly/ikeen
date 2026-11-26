import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { type Href, useRouter } from "expo-router";
import {
  Bell,
  ListFilter,
  ListOrdered,
  Pin,
  Search,
  Sparkles,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { ThemedText } from "../ui/themed-text";
import { ListNotesOptions } from "@/lib/types/notes"; 
import { useDrawerActions } from "../drawer-nav-items";

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

  const { openDrawer } = useDrawerActions();

  const handleNavigateSearch = () => {
    router.push("/search" as Href);
  };

  const handleNavigateAI = () => {
    router.push("/agent");
  };

  const isRemindersActive = filter.remindersOnly === true;
  const isPinnedActive = filter.pinnedOnly === true && !isRemindersActive;
  const isArchivedActive =
    (filter.archivedOnly === true ||
      (filter.includeArchived === true && !filter.pinnedOnly)) &&
    !isRemindersActive;
  const isRecentActive =
    !isPinnedActive && !isArchivedActive && !isRemindersActive;

  const applyView = (view: {
    pinnedOnly: boolean;
    includeArchived: boolean;
    archivedOnly: boolean;
    remindersOnly?: boolean;
  }) => {
    updateFilter({
      ...filter,
      pinnedOnly: view.pinnedOnly,
      includeArchived: view.includeArchived,
      archivedOnly: view.archivedOnly,
      remindersOnly: view.remindersOnly ?? false,
    });
  };

  return (
    <View className="bg-background pb-3">
      {/* Top Header */}
      <View className="flex-row items-center justify-between px-4">
        {/* Title */}
        <View className="flex-row gap-3">
          {/* <Pressable>
            <Card className="px-2 rounded-full flex-row items-center gap-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Drawer"
                hitSlop={8}
                onPress={openDrawer}
                className="items-center justify-center rounded-full">
                <DrawerLeft
                  height={20}
                  width={20}
                  color={colors.text}
                />
              </Pressable>
            </Card>
          </Pressable> */}
          <ThemedText type="title" className="text-xl">
            My Notes
          </ThemedText>
        </View>

        {/* Action Cluster: Search -> Filter -> AI */}
        <View className="px-3 rounded-full flex-row items-center gap-4">
          {/* Search Navigation Trigger */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search notes"
            hitSlop={8}
            onPress={handleNavigateSearch}
            className="items-center justify-center rounded-full">
            <Search size={20} color={colors.text} strokeWidth={2} />
          </Pressable>

          {/* AI Agent Navigation Trigger */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open AI agent"
            hitSlop={8}
            onPress={handleNavigateAI}
            className="items-center justify-center rounded-full">
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
          contentContainerClassName="gap-1.5">
          {/* Filter */}
          {/* <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter and sort notes"
            hitSlop={8}
            onPress={onOpenFilter}
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 border-background-selected bg-card`}>
            <ListFilter size={18} color={colors.text} strokeWidth={2} />
            {hasActiveFilters && (
              <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </Pressable> */}

          {/* Recent */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recent notes"
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
              isRecentActive
                ? "bg-foreground border-foreground"
                : "border-background-selected"
            }`}
            onPress={() => {
              applyView({
                pinnedOnly: false,
                includeArchived: false,
                archivedOnly: false,
                remindersOnly: false,
              });
            }}>
            <ListOrdered
              size={12}
              color={isRecentActive ? colors.background : colors.textSecondary}
            />
            <ThemedText
              className={`text-xs font-semibold ${
                isRecentActive ? "text-background" : "text-text"
              }`}>
              Recent
            </ThemedText>
          </Pressable>

          {/* Pinned */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Pinned notes"
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
              isPinnedActive
                ? "bg-foreground border-foreground"
                : "border-background-selected"
            }`}
            onPress={() => {
              applyView({
                pinnedOnly: true,
                includeArchived: false,
                archivedOnly: false,
                remindersOnly: false,
              });
            }}>
            <Pin
              size={12}
              color={isPinnedActive ? colors.background : colors.textSecondary}
            />
            <ThemedText
              className={`text-xs font-semibold ${
                isPinnedActive ? "text-background" : "text-text"
              }`}>
              Pinned
            </ThemedText>
          </Pressable>

          {/* Archived */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Archived notes"
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
              isArchivedActive
                ? "bg-foreground border-foreground"
                : "border-background-selected"
            }`}
            onPress={() => {
              applyView({
                pinnedOnly: false,
                includeArchived: true,
                archivedOnly: true,
                remindersOnly: false,
              });
            }}>
            <ThemedText
              className={`text-xs font-semibold ${
                isArchivedActive ? "text-background" : "text-text"
              }`}>
              Archived
            </ThemedText>
          </Pressable>

          {/* Reminders Filter Tab */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reminders notes"
            className={`flex-row items-center gap-1.5 px-3 py-0.5 rounded-full border active:opacity-80 ${
              isRemindersActive
                ? "bg-foreground border-foreground"
                : "border-background-selected"
            }`}
            onPress={() => {
              applyView({
                pinnedOnly: false,
                includeArchived: false,
                archivedOnly: false,
                remindersOnly: !isRemindersActive,
              });
            }}>
            <Bell
              size={12}
              color={isRemindersActive ? colors.background : colors.textSecondary}
            />
            <ThemedText
              className={`text-xs font-semibold ${
                isRemindersActive ? "text-background" : "text-text"
              }`}>
              Reminders
            </ThemedText>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}
