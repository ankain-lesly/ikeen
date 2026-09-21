import { useCallback, useState } from "react";
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
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronLeft,
  Folder as FolderIcon,
  Grid2X2,
  List,
  Search,
  Sparkles,
  X,
} from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { BottomTabInset } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import {
  createFolder,
  softDeleteFolder,
  updateFolder,
  useLiveFolders,
} from "@/lib/queries/folders";
import type { CreateFolderInput, FolderWithCount } from "@/lib/types/folders";
import { FolderCard } from "@/components/folders/folder-card";
import { CreateFolderSheet } from "@/components/folders/create-folder-sheet";
import { FolderPinModal } from "@/components/folders/folder-pin-modal";

export default function NotesScreen() {
  const colors = useTheme();

  // Folders State
  const [folderSearch, setFolderSearch] = useState("");
  const [folderSortBy, setFolderSortBy] = useState<"updatedAt" | "name" | "createdAt">("updatedAt");
  const [folderSortDir, setFolderSortDir] = useState<"asc" | "desc">("desc");
  const [folderLayout, setFolderLayout] = useState<"grid" | "list">("grid");

  // Folder Sheets & Modals
  const [isCreateFolderSheetVisible, setIsCreateFolderSheetVisible] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<FolderWithCount | null>(null);
  const [lockedFolderToUnlock, setLockedFolderToUnlock] = useState<FolderWithCount | null>(null);

  const { data: folders = [] } = useLiveFolders({
    search: folderSearch.trim() || undefined,
    orderBy: folderSortBy,
    orderDirection: folderSortDir,
  });

  // Folder Handlers
  const handleFolderPress = (folder: FolderWithCount) => {
    if (folder.isLocked) {
      setLockedFolderToUnlock(folder);
      return;
    }
    router.push(`/folders/${folder.id}` as any);
  };

  const handleUnlockedSuccess = (folder: FolderWithCount) => {
    setLockedFolderToUnlock(null);
    router.push(`/folders/${folder.id}` as any);
  };

  const handleEditFolder = (folder: FolderWithCount) => {
    setFolderToEdit(folder);
    setIsCreateFolderSheetVisible(true);
  };

  const handleSaveFolder = async (data: CreateFolderInput) => {
    if (folderToEdit) {
      await updateFolder(folderToEdit.id, data);
      setFolderToEdit(null);
    } else {
      await createFolder(data);
    }
  };

  const handleDeleteFolder = (folder: FolderWithCount) => {
    Alert.alert(
      "Delete Folder",
      `Delete "${folder.name}"? Notes inside will remain in your library.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await softDeleteFolder(folder.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              Alert.alert("Error", "Could not delete folder");
            }
          },
        },
      ]
    );
  };

  const handleToggleLockFolder = async (folder: FolderWithCount) => {
    try {
      await updateFolder(folder.id, {
        isLocked: !folder.isLocked,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not change lock status");
    }
  };

  const handleCycleFolderSort = () => {
    Haptics.selectionAsync();
    setFolderSortBy((prev) => {
      if (prev === "updatedAt") return "name";
      if (prev === "name") return "createdAt";
      return "updatedAt";
    });
  };

  const handleToggleSortDirection = () => {
    Haptics.selectionAsync();
    setFolderSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };


  const renderFolderItem = useCallback(
    ({ item }: { item: FolderWithCount }) => (
      <View className={folderLayout === "grid" ? "w-1/2 p-1.5" : "w-full py-1.5"}>
        <FolderCard
          folder={item}
          onPress={handleFolderPress}
          onEdit={handleEditFolder}
          onToggleLock={handleToggleLockFolder}
          onDelete={handleDeleteFolder}
        />
      </View>
    ),
    [folderLayout],
  );

  return (
    <View className="flex-1 bg-background pt-safe">
      {/* Universal Top Header */}
      <View className="px-4 pb-3 flex-row items-center justify-between border-b border-border/70">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center bg-background-element active:opacity-70">
            <ChevronLeft size={22} color={colors.text} />
          </Pressable>

          <View className="flex-row items-center gap-2.5">
            <View>
              <ThemedText className="font-bold text-lg text-text leading-tight">
                Folders
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Header Actions */}
        <View className="flex-row items-center gap-2">
          {/* AI Agent Shortcut */}
          <Pressable
            onPress={() => router.push("/agent")}
            hitSlop={6}
            className="w-9 h-9 rounded-full items-center justify-center bg-primary/10 border border-primary/20 active:opacity-70">
            <Sparkles size={17} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {/* Folders View Mode */}
      <View className="flex-1 px-4 pt-3">
        {/* Search Folder Pill Input */}
        <View className="flex-row items-center h-12 px-4 rounded-full bg-background-element border border-border shadow-xs mb-3">
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            value={folderSearch}
            onChangeText={setFolderSearch}
            placeholder="Search Folder"
            placeholderTextColor={colors.textSecondary}
            className="flex-1 ml-2.5 text-sm text-text"
          />
          {folderSearch.length > 0 && (
            <Pressable onPress={() => setFolderSearch("")} hitSlop={6}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Sort & Layout Control Row */}
        <View className="flex-row items-center justify-between pb-3 pt-1">
          {/* Sort Dropdown / Cycle button */}
          <Pressable
            onPress={handleCycleFolderSort}
            className="flex-row items-center gap-1.5 active:opacity-70">
            <Pressable onPress={handleToggleSortDirection} hitSlop={6}>
              {folderSortDir === "desc" ? (
                <ArrowDownWideNarrow size={17} color={colors.text} />
              ) : (
                <ArrowUpNarrowWide size={17} color={colors.text} />
              )}
            </Pressable>
            <Text className="text-sm font-semibold text-text">
              {folderSortBy === "updatedAt"
                ? "Last modified"
                : folderSortBy === "name"
                  ? "Name"
                  : "Date created"}
            </Text>
          </Pressable>

          {/* Grid vs List View Toggle */}
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setFolderLayout((prev) => (prev === "grid" ? "list" : "grid"));
            }}
            hitSlop={8}
            className="w-8 h-8 rounded-lg items-center justify-center active:bg-background-element">
            {folderLayout === "grid" ? (
              <Grid2X2 size={20} color={colors.text} />
            ) : (
              <List size={20} color={colors.text} />
            )}
          </Pressable>
        </View>

        {/* Folders List/Grid */}
        <FlatList
          key={folderLayout} // Re-render when layout columns change
          data={folders}
          numColumns={folderLayout === "grid" ? 2 : 1}
          renderItem={renderFolderItem}
          keyExtractor={(item) => item.id}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: BottomTabInset + 80,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20 px-6">
              <View className="w-16 h-16 rounded-full items-center justify-center bg-background-element mb-3">
                <FolderIcon size={32} color={colors.textSecondary} />
              </View>
              <ThemedText className="font-semibold text-base text-text text-center">
                {folderSearch.trim() ? "No matching folders" : "No folders yet"}
              </ThemedText>
              <Text className="text-xs text-text-secondary text-center mt-1.5 leading-relaxed">
                {folderSearch.trim()
                  ? "Try a different search keyword."
                  : "Tap the + button to create your first folder."}
              </Text>
            </View>
          }
        />
      </View>

      {/* Create / Edit Folder Modal Sheet */}
      <CreateFolderSheet
        isPresented={isCreateFolderSheetVisible}
        onDismiss={() => {
          setIsCreateFolderSheetVisible(false);
          setFolderToEdit(null);
        }}
        folderToEdit={folderToEdit}
        onSave={handleSaveFolder}
      />

      {/* Locked Folder PIN Unlock Modal */}
      <FolderPinModal
        visible={lockedFolderToUnlock !== null}
        folder={lockedFolderToUnlock}
        onClose={() => setLockedFolderToUnlock(null)}
        onSuccess={handleUnlockedSuccess}
      />
    </View>
  );
}
