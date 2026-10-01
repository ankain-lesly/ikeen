import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "@/lib/haptics";
import {
  ChevronLeft,
  FileText,
  Search,
  SquarePen,
  X,
} from "lucide-react-native";

import { NoteCard } from "@/components/notes/note-card";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import {
  softDeleteFolder,
  updateFolder,
  useLiveFolder,
} from "@/lib/queries/folders";
import {
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  useLiveNotes,
} from "@/lib/queries/notes";
import type { Note } from "@/lib/types/notes";
import { FolderGlyph } from "@/components/folders/folder-glyph";
import { FolderDetailDropdown } from "@/components/folders/folder-detail-dropdown";
import { CreateFolderSheet } from "@/components/folders/create-folder-sheet";
import type { CreateFolderInput } from "@/lib/types/folders";

export default function FolderDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: folder } = useLiveFolder(id as string);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditSheetPresented, setIsEditSheetPresented] = useState(false);

  // Live notes inside this specific folder
  const { data: rawNotes = [] } = useLiveNotes({
    folderId: id as string,
    search: searchQuery.trim() || undefined,
  });

  const notes = useMemo(() => {
    return (rawNotes ?? []).filter((n) => !n.isArchived);
  }, [rawNotes]);

  const handleTogglePin = useCallback(async (noteId: string) => {
    try {
      await togglePinNote(noteId);
    } catch {
      Alert.alert("Error", "Could not update pin state");
    }
  }, []);

  const handleToggleArchive = useCallback(async (noteId: string) => {
    try {
      await toggleArchiveNote(noteId);
    } catch {
      Alert.alert("Error", "Could not update archive state");
    }
  }, []);

  const handleDeleteNote = useCallback((noteId: string) => {
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
              await softDeleteNote(noteId);
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
    router.push({
      pathname: "/notes/create",
    });
  };

  const handleSaveEditFolder = async (data: CreateFolderInput) => {
    if (!folder) return;
    await updateFolder(folder.id, {
      name: data.name,
      color: data.color,
      isLocked: data.isLocked,
      pinCode: data.pinCode,
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

  const renderNoteItem = useCallback(
    ({ item }: { item: Note }) => (
      <View className="w-1/2 p-1.5">
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
      <View className="px-4 pb-3 pt-2 border-b border-border flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            hitSlop={8}
            className="min-h-11 min-w-11 rounded-full items-center justify-center bg-background-element active:opacity-70">
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
          onEdit={() => setIsEditSheetPresented(true)}
          onToggleLock={handleToggleLock}
          onDelete={handleDeleteFolder}
        />
      </View>

      {/* Search Bar in Folder */}
      <View className="px-4 pt-3 pb-1">
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
      <FlatList
        data={notes}
        numColumns={2}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        className="flex-1"
        contentContainerClassName="pt-2 px-2.5 pb-safe-offset-20"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-8">
            <View className="w-16 h-16 rounded-full items-center justify-center bg-background-element mb-3">
              <FileText size={32} color={colors.textSecondary} />
            </View>
            <ThemedText className="font-semibold text-base text-text text-center">
              {searchQuery.trim() ? "No matching notes" : "Folder is empty"}
            </ThemedText>
            <Text className="text-xs text-text-secondary text-center mt-1.5 leading-relaxed">
              {searchQuery.trim()
                ? "Try searching for a different keyword."
                : "Create a note to start organizing in this folder."}
            </Text>
          </View>
        }
      />

      {/* Bottom Floating Bar */}
      <View className="absolute bottom-safe left-5 right-5 h-13 rounded-full border border-border bg-card shadow-lg flex-row items-center justify-between px-4.5">
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

      {/* Edit Folder Sheet */}
      <CreateFolderSheet
        isPresented={isEditSheetPresented}
        onDismiss={() => setIsEditSheetPresented(false)}
        folderToEdit={folder}
        onSave={handleSaveEditFolder}
      />
    </View>
  );
}
