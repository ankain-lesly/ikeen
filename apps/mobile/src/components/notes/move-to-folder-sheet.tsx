import { FlatList, Pressable, Text, View } from "react-native";
import { OptionSheet } from "@/components/ui/option-sheet";
import * as Haptics from "@/lib/haptics";
import { Check, X } from "lucide-react-native";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useLiveFolders } from "@/lib/queries/folders";
import { FolderGlyph } from "../folders/folder-glyph";
import { FolderWithCount } from "@/lib/types/folders";
import { useRouter } from "expo-router";

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
  const router = useRouter();

  const handleSelect = async (folderId: string | null) => {
    Haptics.selectionAsync();
    await onSelectFolder(folderId);
    onDismiss();
  };

  const renderItem = (folder: FolderWithCount, index: number) => {
    const isCurrent = currentFolderId === folder.id;

    return (
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
    );
  };

  return (
    <OptionSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      snapPoints={["half", "full"]}
      actions={[]}
    >
      <View className="flex-1 bg-card px-2 pb-safe">
        {/* Header */}
        <View className="flex-row items-center justify-between pb-2">
          <ThemedText className="text-lg font-bold text-text">
            Move to Folder
          </ThemedText>

          <View className="items-center flex-row gap-4">
            {currentFolderId !== null && (
              <Pressable onPress={() => handleSelect(null)}>
                <Text className="text-red-500 font-semibold text-sm">
                  Remove Folder
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={onDismiss}
              hitSlop={8}
              className="w-8 h-8 rounded-full items-center justify-center bg-background-element active:opacity-70">
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        <FlatList
          showsVerticalScrollIndicator={false}
          className="flex-1 pt-3"
          data={folders}
          keyExtractor={(folder) => folder.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 0 }}
          renderItem={({ item, index }) => renderItem(item, index)}
          ListFooterComponent={
            <View className="pt-4">
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/notes/create-folder",
                  })
                }
                className={`h-11 rounded-full items-center justify-center bg-foreground active:opacity-90 mb-6`}>
                <Text className="text-background font-semibold text-base">
                  Add Folder
                </Text>
              </Pressable>
            </View>
          }
        />
      </View>
    </OptionSheet>
  );
}
