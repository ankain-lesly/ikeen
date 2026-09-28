import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Folder, Pin, Plus, Sparkles, X } from "lucide-react-native";
import {
  NoteAccessoryBar,
  NoteMinimalToolbar,
} from "@/components/notes/note-accessory-bar";
import { NoteInfoSheet } from "@/components/notes/note-info-sheet";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "@/lib/toast";
import {
  hardDeleteNote,
  moveNoteToFolder,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  updateNote,
  useLiveNote,
} from "@/lib/queries/notes";
import { useLiveFolder } from "@/lib/queries/folders";
import type { Note } from "@/lib/types/notes";
import NotesDetailDropdown from "@/components/notes/notes-detail-dropdown";
import { MoveToFolderSheet } from "@/components/notes/move-to-folder-sheet";
import { formatDate } from "@repo/utils/date";

import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { KeyboardGradualAnimation } from "@/components/keyboard-gradual-animation";
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
