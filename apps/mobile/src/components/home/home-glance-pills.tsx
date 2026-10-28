import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { FileText, Folder, Pin } from "lucide-react-native";

import { Card } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { useNotesStats } from "@/lib/queries/notes";
import { useLiveFolders } from "@/lib/queries/folders";

export function HomeGlancePills() {
  const colors = useTheme();
  const router = useRouter();

  // Accurate SQLite queries with single-row SQL aggregation
  const { activeCount, pinnedCount = 0 } = useNotesStats();
  const { data: folders = [] } = useLiveFolders();

  const handleOpenNotes = () => {
    router.push("/(tabs)/notes");
  };

  const handleOpenFolders = () => {
    router.push("/(tabs)/folders");
  };

  return (
    <View className="px-4 pb-4">
      <View className="flex-row items-center gap-2.5">
        {/* Notes Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open all ${activeCount} notes`}
          onPress={handleOpenNotes}
          className="flex-1">
          <Card className="py-2 px-4 rounded-3xl flex-row items-center justify-center gap-2">
            <FileText size={18} color={colors.text} strokeWidth={1.8} />
            <Text className="text-sm font-semibold text-text font-mono">
              {activeCount} Notes
            </Text>
          </Card>
        </Pressable>

        {/* Folders Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open all ${folders.length} folders`}
          onPress={handleOpenFolders}
          className="flex-1">
          <Card className="py-2 px-4 rounded-3xl flex-row items-center justify-center gap-2">
            <Folder size={18} color={colors.text} strokeWidth={1.8} />
            <Text className="text-sm font-semibold text-text font-mono">
              {folders.length} Folders
            </Text>
          </Card>
        </Pressable>

        {/* Folders Pill */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open all ${folders.length} folders`}
          onPress={handleOpenNotes}
          className="">
          <Card className="py-2 px-4 rounded-3xl flex-row items-center justify-center gap-2">
            <Pin size={18} color={colors.text} strokeWidth={1.8} />
            <Text className="text-sm font-semibold text-text font-mono">
              {pinnedCount} Pinned
            </Text>
          </Card>
        </Pressable>
      </View>
    </View>
  );
}
