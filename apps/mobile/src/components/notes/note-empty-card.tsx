import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { EmptyNotesIllustration } from "@/components/illustrations";

export const NoteEmptyCard = ({ hide = false }) => {
  const router = useRouter();
  const colors = useTheme();

  const handleCreateNote = () => {
    router.push("/notes/create");
  };

  if (hide === true) return null;
  return (
    <View className="gap-2.5">
      <View className="p-8 items-center justify-center text-center gap-3">
        <EmptyNotesIllustration width={140} height={110} />
        <ThemedText className="text-base font-bold text-text mt-2">
          Your canvas is empty
        </ThemedText>
        <Text className="text-xs text-text-secondary text-center max-w-60">
          Capture meeting thoughts, daily tasks, or creative sparks in iKeen.
        </Text>
        <Pressable
          onPress={handleCreateNote}
          className="mt-2 px-5 py-2.5 rounded-xl bg-foreground flex-row items-center gap-2 active:opacity-75">
          <Plus size={15} color={colors.background} />
          <Text className="text-xs font-bold text-background">
            Create First Note
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
