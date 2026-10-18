import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "@/lib/haptics";
import { ChevronLeft, Search, SquarePen, X } from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
  softDeleteFolder,
  updateFolder,
  useLiveFolder,
} from "@/lib/queries/folders";
import { useLiveNotes } from "@/lib/queries/notes";
import type { ListNotesOptions } from "@/lib/types/notes";
import { FolderGlyph } from "@/components/folders/folder-glyph";
import { FolderDetailDropdown } from "@/components/folders/folder-detail-dropdown";
import { NoteEmptyCard } from "@/components/notes/note-empty-card";
import { NoteGridContainer } from "@/components/notes/notes-grid-container";

export default function FolderDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: folder } = useLiveFolder(id as string);
  const [searchQuery, setSearchQuery] = useState("");

  const [filter, setFilter] = useState<ListNotesOptions>({
    folderId: id as string,
    search: searchQuery.trim() || undefined,
  });

  // Live notes inside this specific folder
  const { data: rawNotes = [] } = useLiveNotes({
    ...filter,
  });

  const notes = useMemo(() => {
    return (rawNotes ?? []).filter((n) => !n.isArchived);
  }, [rawNotes]);

  const handleNewNote = async () => {
    router.push({
      pathname: "/notes/create",
    });
  };

  const handleDeleteFolder = () => {
    if (!folder) return;
    Alert.alert(
      "Delete Folder",
      `Delete "${folder.name}"? Notes inside will remain in All Notes.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await softDeleteFolder(folder.id);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              router.back();
            } catch {
              Alert.alert("Error", "Failed to delete folder");
            }
          },
        },
      ],
    );
  };

  const handleToggleLock = async () => {
    if (!folder) return;
    await updateFolder(folder.id, {
      isLocked: !folder.isLocked,
    });
  };

  if (!folder) {
    return (
      <View className="flex-1 bg-background pt-safe pb-safe justify-center items-center">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-safe">
      {/* Top Header */}
      <View className="px-4 pb-1 pt-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={8}
            className="min-h-11 min-w-11 rounded-full items-center justify-center bg-background-element_active:opacity-70">
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>

          <View className="flex-row items-center gap-2.5">
            <FolderGlyph
              color={folder.color}
              isLocked={folder.isLocked}
              size="sm"
            />
            <View>
              <ThemedText className="font-bold text-lg text-text leading-tight">
                {folder.name}
              </ThemedText>
              <Text className="text-xs text-text-secondary font-mono">
                {notes.length} {notes.length === 1 ? "note" : "notes"}
              </Text>
            </View>
          </View>
        </View>

        <FolderDetailDropdown
          folder={folder}
          onEdit={() =>
            router.push({
              pathname: "/notes/create-folder",
              params: {
                folder: JSON.stringify(folder),
              },
            })
          }
          onToggleLock={handleToggleLock}
          onDelete={handleDeleteFolder}
        />
      </View>

      {/* Search Bar in Folder */}
      <View className="px-4 pt-3 pb-2 border-b border-border">
        <View className="flex-row items-center h-10 px-3.5 rounded-full bg-background-element border border-border">
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={`Search in ${folder.name}...`}
            placeholderTextColor={colors.textSecondary}
            className="flex-1 ml-2 text-sm text-text"
          />
          {searchQuery.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              className="min-h-11 min-w-11 items-center justify-center">
              <X size={14} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Notes List */}

      <NoteGridContainer
        filter={filter}
        updateFilter={(key, val) =>
          setFilter((prev) => ({ ...prev, [key]: val }))
        }
        data={notes}
        empty={<NoteEmptyCard />}
      />

      {/* Bottom Floating Bar */}
      <View className="absolute bottom-safe-offset-2 items-center justify-center w-full">
        <View className="h-13 rounded-full border border-border bg-card shadow-lg flex-row items-center justify-between px-4.5 gap-4">
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
    </View>
  );
}
