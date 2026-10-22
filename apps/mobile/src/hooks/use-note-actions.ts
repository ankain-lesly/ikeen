import { useCallback } from "react";
import { Alert, Share } from "react-native";
import * as Haptics from "@/lib/haptics";
import { toast } from "@/lib/toast";
import {
  togglePinNote,
  toggleArchiveNote,
  softDeleteNote,
  hardDeleteNote,
  restoreNote,
} from "@/lib/queries/notes";
import { Note } from "@repo/types";

export type NoteUpdateStateKey = keyof Note;

export interface NoteActionsOptions {
  noteId: string;
  title: string;
  content: string;
  isPinned: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  isNewDraft?: boolean;
  onUpdateState?: (key: NoteUpdateStateKey, value: any) => void;
  onDeleteSuccess?: () => void;
  onRestoreSuccess?: () => void;
}

export function useNoteActions({
  noteId,
  title,
  content,
  isPinned,
  isArchived,
  isDeleted,
  isNewDraft = false,
  onUpdateState,
  onDeleteSuccess,
  onRestoreSuccess,
}: NoteActionsOptions) {
  const handleTogglePin = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUpdateState?.("isPinned", !isPinned);
    if (isNewDraft) return;
    try {
      await togglePinNote(noteId);
    } catch {
      onUpdateState?.("isPinned", isPinned);
      Alert.alert("Error", "Could not update pin state");
    }
  }, [isNewDraft, noteId, isPinned, onUpdateState]);

  const handleToggleArchive = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdateState?.("isArchived", !isArchived);
    if (isNewDraft) return;
    try {
      await toggleArchiveNote(noteId);
    } catch {
      onUpdateState?.("isArchived", isArchived);
      Alert.alert("Error", "Could not update archive state");
    }
  }, [isNewDraft, noteId, isArchived, onUpdateState]);

  const handleDeleteNote = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (isNewDraft) {
      onDeleteSuccess?.();
      return;
    }
    Alert.alert(
      "Delete Note",
      "Are you sure you want to move this note to recently deleted?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await softDeleteNote(noteId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onDeleteSuccess?.();
            } catch {
              Alert.alert("Error", "Could not delete note");
            }
          },
        },
      ],
    );
  }, [isNewDraft, noteId, onDeleteSuccess]);

  const handleHardDelete = useCallback(() => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await hardDeleteNote(noteId);
            toast.info("Note deleted");
            onDeleteSuccess?.();
          } catch {
            Alert.alert("Error", "Could not delete note");
          }
        },
      },
    ]);
  }, [noteId, onDeleteSuccess]);

  const handleRestoreNote = useCallback(async () => {
    try {
      await restoreNote(noteId);
      toast.success("Note restored");
      onRestoreSuccess?.();
    } catch {
      toast.error("Could not restore note");
    }
  }, [noteId, onRestoreSuccess]);

  const handleShareNote = useCallback(async () => {
    try {
      await Share.share({
        title,
        message: `${title}\n\n${content}`,
      });
    } catch {
      // Ignored
    }
  }, [title, content]);

  return {
    handleTogglePin,
    handleToggleArchive,
    handleDeleteNote,
    handleHardDelete,
    handleRestoreNote,
    handleShareNote,
  };
}
