import { Pressable, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import { FileText, Folder as FolderIcon } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";

export type NotesTab = "folders" | "notes";

export function NotesFolderTabs() {
  
  const pathname = usePathname();

  // Determine which action is "active"
  const isFolderActive = pathname === "/notes/folders";
  const isNoteActive = pathname === "/notes";

  const activeTab = isFolderActive ? "folders" : isNoteActive ? "notes" : null;

  const colors = useTheme();
  return (
    <View className="flex-row w-full gap-3 absolute bottom-2 items-center justify-center">
      {/* Segment Toggle: Folders vs All Notes */}
      <View className="flex-row items-center bg-foreground p-1 rounded-xl border border-border">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(tabs)/notes");
          }}
          className={`flex-row items-center gap-1.5 px-3 py-1 rounded-lg ${
            activeTab === "notes" ? "bg-card shadow-sm" : ""
          }`}>
          <FileText
            size={14}
            color={
              activeTab === "notes" ? colors.primary : colors.textSecondary
            }
          />
          <Text
            className={`text-xs font-semibold ${
              activeTab === "notes" ? "text-text" : "text-text-secondary"
            }`}>
            {/* Notes ({notesLength}) */}
            Notes
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(tabs)/notes/folders");
          }}
          className={`flex-row items-center gap-1.5 px-3 py-1 rounded-lg ${
            activeTab === "folders" ? "bg-card shadow-sm" : ""
          }`}>
          <FolderIcon
            size={14}
            color={
              activeTab === "folders" ? colors.primary : colors.textSecondary
            }
          />
          <Text
            className={`text-xs font-semibold ${
              activeTab === "folders" ? "text-text" : "text-text-secondary"
            }`}>
            Folders
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
