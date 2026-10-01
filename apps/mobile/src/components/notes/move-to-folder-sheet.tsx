import React, { useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import * as Haptics from "@/lib/haptics";
import { Box, Check, FolderX, X } from "lucide-react-native";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { createFolder, useLiveFolders } from "@/lib/queries/folders";
import { FolderGlyph } from "../folders/folder-glyph";
import { CreateFolderInput, FolderWithCount } from "@/lib/types/folders";
import { CreateFolderSheet } from "../folders/create-folder-sheet";
import { toast } from "@/lib/toast";

export interface MoveToFolderSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  currentFolderId: string | null | undefined;
  onSelectFolder: (folderId: string | null) => Promise<void>;
}

export function MoveToFolderSheet({
  isPresented,
  onDismiss,
  currentFolderId,
  onSelectFolder,
}: MoveToFolderSheetProps) {
  const colors = useTheme();
  const { data: folders = [] } = useLiveFolders();
  const [isCreateFolderSheetVisible, setIsCreateFolderSheetVisible] =
    useState(false);

  const handleSelect = async (folderId: string | null) => {
    Haptics.selectionAsync();
    await onSelectFolder(folderId);
    onDismiss();
  };

  const renderItem = (folder: FolderWithCount, index: number) => {
    const isCurrent = currentFolderId === folder.id;

    return (
      <>
        <View className="w-1/2 p-1">
          <Pressable
            key={folder.id}
            onPress={() => handleSelect(folder.id)}
            className={`flex-1 flex-row items-center justify-between p-3.5 rounded-2xl border ${
              isCurrent
                ? "border-primary bg-primary/10"
                : "border-border bg-background-element active:bg-background-selected"
            }`}>
            <View className="flex-row items-center gap-3">
              <FolderGlyph
                color={folder.color}
                isLocked={folder.isLocked}
                size="sm"
              />
              <View className="flex-1">
                <Text
                  className="font-semibold text-text text-sm"
                  numberOfLines={2}>
                  {folder.name}
                </Text>
                <Text className="text-xs text-text-secondary font-mono">
                  {folder.noteCount} {folder.noteCount === 1 ? "note" : "notes"}
                </Text>
              </View>
            </View>

            {isCurrent && (
              <View className="absolute right-1.5">
                <Check size={18} color={colors.primary} strokeWidth={2.6} />
              </View>
            )}
          </Pressable>
        </View>
      </>
    );
  };

  const handleSaveFolder = async (data: CreateFolderInput) => {
    try {
      await createFolder(data);
      toast.success("New Folder Added");
      setIsCreateFolderSheetVisible(false);
    } catch (error) {
      toast.error("Could not add folder");
      console.log(error);
    }
  };

  return (
    <>
      <Host matchContents>
        {isPresented && (
          <BottomSheet
            isPresented={isPresented}
            onDismiss={onDismiss}
            snapPoints={["half", "full"]}
            showDragIndicator={true}
            containerColor={colors.card}>
            <RNHostView>
              <View className="flex-1 bg-card pt-2 px-2 pb-safe">
                {/* Header */}
                <View className="flex-row items-center justify-between pb-2">
                  <ThemedText className="text-lg font-bold text-text">
                    Move to Folder
                  </ThemedText>

                  <Pressable
                    onPress={onDismiss}
                    hitSlop={8}
                    className="w-8 h-8 rounded-full items-center justify-center bg-background-element active:opacity-70">
                    <X size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <FlatList
                  showsVerticalScrollIndicator={false}
                  className="flex-1 pt-3"
                  contentContainerClassName=""
                  data={folders}
                  keyExtractor={(folder) => folder.id}
                  numColumns={2}
                  columnWrapperStyle={{ gap: 0 }}
                  // contentContainerStyle={{ padding: 10 }}
                  renderItem={({ item, index }) => renderItem(item, index)}
                  ListHeaderComponent={
                    <View className="_w-1/2 p-1">
                      <Pressable
                        onPress={() => handleSelect(null)}
                        className={`flex-1 flex-row items-center justify-between p-3.5 rounded-2xl border ${
                          !currentFolderId
                            ? "border-primary bg-primary/10"
                            : "border-border bg-background-element active:bg-background-selected"
                        }`}>
                        <View className="flex-row items-center gap-3">
                          <View className="w-10 h-10 rounded-xl items-center justify-center bg-background-element">
                            <FolderX size={20} color={colors.textSecondary} />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="font-semibold text-text text-sm"
                              numberOfLines={2}>
                              Unorganized (No Folder)
                            </Text>
                            <Text className="text-xs text-text-secondary">
                              Root note library
                            </Text>
                          </View>
                        </View>

                        {!currentFolderId ? (
                          <View className="absolute right-1.5">
                            <Check
                              size={18}
                              color={colors.primary}
                              strokeWidth={2.6}
                            />
                          </View>
                        ) : (
                          <View className="absolute right-1.5">
                            <Box
                              size={18}
                              color={colors.textSecondary}
                              strokeWidth={2.6}
                            />
                          </View>
                        )}
                      </Pressable>
                    </View>
                  }
                  ListFooterComponent={
                    <View className="pt-4">
                      <Pressable
                        onPress={() => setIsCreateFolderSheetVisible(true)}
                        className={`h-11 rounded-full items-center justify-center bg-foreground active:opacity-90 mb-6`}>
                        <Text className="text-background font-semibold text-base">
                          Add Folder Design
                        </Text>
                      </Pressable>
                    </View>
                  }
                />
              </View>
            </RNHostView>
          </BottomSheet>
        )}
      </Host>

      {/* Create / Edit Folder Modal Sheet */}
      <CreateFolderSheet
        isPresented={isCreateFolderSheetVisible}
        onDismiss={() => {
          setIsCreateFolderSheetVisible(false);
        }}
        onSave={handleSaveFolder}
      />
    </>
  );
}
