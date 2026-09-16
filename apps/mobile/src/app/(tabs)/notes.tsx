import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  FileText,
  Pin,
  Search,
  SlidersHorizontal,
  SquarePen,
  X,
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
import type { Note } from "@/lib/types/notes";

type FilterMode = "all" | "pinned" | "archived";

export default function NotesScreen() {
  const colors = useTheme();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortOrder, setSortOrder] = useState<
    "updatedAt" | "createdAt" | "title"
  >("updatedAt");

  // Query SQLite reactively
  const { data: rawNotes = [] } = useLiveNotes({
    search: searchQuery.trim() || undefined,
    includeArchived: filterMode === "archived",
    pinnedFirst: true,
    orderBy: sortOrder,
    orderDirection: sortOrder === "title" ? "asc" : "desc",
  });

  // Filter notes in memory if necessary
  const notes = useMemo(() => {
    const list = rawNotes ?? [];
    if (filterMode === "pinned") {
      return list.filter((n) => n.isPinned && !n.isArchived);
    }
    if (filterMode === "archived") {
      return list.filter((n) => n.isArchived);
    }
    return list.filter((n) => !n.isArchived);
  }, [rawNotes, filterMode]);

  // Handlers
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

  const handleDelete = useCallback((id: string) => {
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

  const handleNewNote = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const newNote = await createNote();
      router.push({
        pathname: "/notes/[id]",
        params: { id: newNote.id },
      });
    } catch {
      Alert.alert("Error", "Failed to create new note");
    }
  };

  const handleFilterChange = (mode: FilterMode) => {
    Haptics.selectionAsync();
    setFilterMode(mode);
  };

  const handleSortCycle = () => {
    Haptics.selectionAsync();
    setSortOrder((prev) => {
      if (prev === "updatedAt") return "createdAt";
      if (prev === "createdAt") return "title";
      return "updatedAt";
    });
  };

  const sortLabel = useMemo(() => {
    if (sortOrder === "updatedAt") return "Modified";
    if (sortOrder === "createdAt") return "Created";
    return "Title";
  }, [sortOrder]);

  const renderNoteItem = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        note={item}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
        onDelete={handleDelete}
      />
    ),
    [handleTogglePin, handleToggleArchive, handleDelete],
  );

  return (
    <View className="flex-1 bg-background pt-safe w-full max-w-[800px] mx-auto">
        {/* Top Header */}
        <View className="flex-row items-center justify-between px-4.5 pt-2 pb-1">
          <ThemedText type="title">Notes</ThemedText>

          {/* Sort Cycle Button */}
          <Pressable
            className="flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border border-border bg-background-element active:opacity-70"
            onPress={handleSortCycle}>
            <SlidersHorizontal size={14} color={colors.textSecondary} />
            <Text className="text-xs font-medium text-text-secondary">
              {sortLabel}
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View className="px-4 py-2">
          <View className="flex-row items-center gap-2 px-3 h-10 rounded-2xl border border-border bg-background-element">
            <Search size={16} color={colors.textSecondary} />
            <TextInput
              className="flex-1 text-sm py-0 text-text"
              placeholder="Search notes and tags..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="never"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                className="p-1 rounded-full active:opacity-60">
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Segmented Filter Pills */}
        <View className="flex-row gap-2 px-4 pb-2.5">
          {(["all", "pinned", "archived"] as const).map((mode) => {
            const isActive = filterMode === mode;
            const label =
              mode === "all"
                ? "All Notes"
                : mode === "pinned"
                  ? "Pinned"
                  : "Archived";
            return (
              <Pressable
                key={mode}
                className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-xl border active:opacity-80 ${
                  isActive
                    ? "bg-background-selected border-primary"
                    : "bg-background-element border-border"
                }`}
                onPress={() => handleFilterChange(mode)}>
                {mode === "pinned" && (
                  <Pin
                    size={12}
                    color={isActive ? colors.primary : colors.textSecondary}
                    style={{ transform: [{ rotate: "45deg" }] }}
                  />
                )}
                <Text
                  className={`text-xs ${
                    isActive
                      ? "text-text font-semibold"
                      : "text-text-secondary font-normal"
                  }`}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Note List */}
        <FlatList
          data={notes}
          renderItem={renderNoteItem}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerClassName="pt-1 px-4"
          contentContainerStyle={{
            paddingBottom: BottomTabInset + 76,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-16 px-8">
              <View className="w-16 h-16 rounded-full items-center justify-center bg-background-element mb-3">
                <FileText size={32} color={colors.textSecondary} />
              </View>
              <ThemedText className="font-semibold text-base text-text text-center">
                {searchQuery.trim().length > 0
                  ? "No matching notes"
                  : filterMode === "pinned"
                    ? "No pinned notes"
                    : filterMode === "archived"
                      ? "No archived notes"
                      : "No notes yet"}
              </ThemedText>
              <Text className="text-xs text-text-secondary text-center mt-1.5 leading-relaxed">
                {searchQuery.trim().length > 0
                  ? "Try searching for a different keyword or tag."
                  : "Capture your thoughts, ideas, and architecture notes."}
              </Text>
            </View>
          }
        />

        {/* Floating Bottom Action Bar */}
        <View
          // style={{ bottom: BottomTabInset + 12 }}
          className="absolute bottom-safe left-5 right-5 h-13 rounded-full border border-border bg-card shadow-lg flex-row items-center justify-between px-4.5">
          <Text className="text-xs font-medium text-text-secondary font-mono">
            {notes.length} {notes.length === 1 ? "Note" : "Notes"}
          </Text>

          <Pressable
            className="flex-row items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary active:opacity-90 active:scale-[0.98]"
            onPress={handleNewNote}>
            <SquarePen size={17} color="#ffffff" />
            <Text className="text-white text-sm font-semibold">New Note</Text>
          </Pressable>
        </View>
    </View>
  );
}
