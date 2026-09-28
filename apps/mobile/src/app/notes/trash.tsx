import { NoteGridContainer } from "@/components/notes/notes-grid-container";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useLiveNotes } from "@/lib/queries/notes";
import { useRouter } from "expo-router";
import { ChevronLeft, Trash } from "lucide-react-native";
import { Pressable, View } from "react-native";

export default function NoteCreateScreen() {
  const colors = useTheme();
  const router = useRouter();

  const { data: notes = [] } = useLiveNotes({
    includeDeleted: true,
  });

  const trashedNotes = notes.filter((n) => !!n.deletedAt);

  return (
    <View className="flex-1 bg-background">
      {/* Top Spacer & Center Graphic */}
      <View className="bg-background pt-safe">
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
                  Recycle bin
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Header Actions */}
          <View className="flex-row items-center gap-2">
            <Pressable
              hitSlop={6}
              className="w-9 h-9 rounded-full items-center justify-center">
              <Trash size={17} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>

      <NoteGridContainer
        showFilter={false}
        data={trashedNotes}
        filter={{}}
        updateFilter={() => {}}
      />
    </View>
  );
}
