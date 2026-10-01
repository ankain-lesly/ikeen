import {
  ActivityIndicator,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTheme } from "@/hooks/use-theme";
import {
  useLiveNote,
} from "@/lib/queries/notes";

import { NoteEditor } from "@/components/notes/note-editor";

export default function NoteDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: note } = useLiveNote(id as string);

  if (!note) {
    return (
      <View className="flex-1 bg-background pt-safe pb-safe justify-center items-center">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return <NoteEditor key={note.id} note={note}  />;
}
