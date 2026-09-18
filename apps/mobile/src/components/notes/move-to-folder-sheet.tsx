import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { BottomSheet, Host, RNHostView } from "@expo/ui";
import * as Haptics from "expo-haptics";
import { Check, FolderX, X } from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useLiveFolders } from "@/lib/queries/folders";
import { FolderGlyph } from "../folders/folder-glyph";
import { FolderWithCount } from "@/lib/types/folders";

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

  const handleSelect = async (folderId: string | null) => {
    Haptics.selectionAsync();
    await onSelectFolder(folderId);
    onDismiss();
  };

  const renderItem = (folder: FolderWithCount, index: number) => {
    const isCurrent = currentFolderId === folder.id;

    return (
      <>
        {index === 0 && (
          <Pressable
            onPress={() => handleSelect(null)}
            className={`w-1/2 flex-row items-center justify-between p-3.5 rounded-2xl border ${
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

            {!currentFolderId && (
              <View className="absolute right-1.5">
                <Check size={18} color={colors.primary} strokeWidth={2.6} />
              </View>
            )}
          </Pressable>
        )}
        <Pressable
          key={folder.id}
          onPress={() => handleSelect(folder.id)}
          className={`w-1/2 flex-row items-center justify-between p-3.5 rounded-2xl border ${
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
      </>
    );
  };

  return (
    <Host matchContents>
      {isPresented && (
        <BottomSheet
          isPresented={isPresented}
          onDismiss={onDismiss}
          snapPoints={["half", "full"]}
          showDragIndicator={true}
          containerColor={colors.card}>
          <RNHostView>
            <View className="flex-1 bg-card px-4 pt-2 pb-safe">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-4 border-b border-border">
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
                contentContainerClassName="gap-2"
                data={folders}
                // ListHeaderComponent={
                //   <View className="flex-row items-center justify-between p-3.5 rounded-2xl border border-border bg-background-element">
                //     <View className="flex-row items-center gap-3">
                //       <FolderX size={20} color={colors.textSecondary} />
                //       <View>
                //         <Text className="font-semibold text-text text-sm">Unorganized (No Folder)</Text>
                //       </View>
                //     </View>
                //     <Check size={18} color={colors.primary} strokeWidth={2.6} />
                //   </View>
                // }
                keyExtractor={(folder) => folder.id}
                numColumns={2}
                columnWrapperStyle={{ gap: 10 }}
                // contentContainerStyle={{ padding: 10 }}
                renderItem={({ item, index }) => renderItem(item, index)}
              />
            </View>
          </RNHostView>
        </BottomSheet>
      )}
    </Host>
  );
}
