import React from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Camera, CheckSquare, Mic, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Crypto from "expo-crypto";

import { Card } from "@/components/ui/card";
import { useTheme } from "@/hooks/use-theme";
import { createNote } from "@/lib/queries/notes";
import { createBlock } from "@/lib/queries/note-blocks";
import {
  createDefaultChecklistBlockInput,
  createDefaultMediaBlockInput,
} from "@/components/notes/blocks";
import { takePhotoWithCamera } from "@/lib/media/pickers";

export function QuickCaptureBar() {
  const colors = useTheme();
  const router = useRouter();

  // 1. Create Blank Note
  const handleCreateBlankNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/notes/create");
  };

  // 2. Create Checklist Note directly with initial checklist block
  const handleCreateChecklistNote = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const noteId = Crypto.randomUUID();
      await createNote({ id: noteId, title: "Title" });
      await createBlock(noteId, createDefaultChecklistBlockInput());
      router.push(`/notes/${noteId}`);
    } catch {
      router.push("/notes/create");
    }
  };

  // 3. Create Audio / Voice Memo Note
  const handleCreateAudioNote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/notes/create");
  };

  // 4. Capture Photo directly with Camera into a new Note
  const handleCreatePhotoNote = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const item = await takePhotoWithCamera();
      if (!item) return;

      const noteId = Crypto.randomUUID();
      await createNote({ id: noteId, title: "Title" });
      await createBlock(noteId, createDefaultMediaBlockInput([item]));
      router.push(`/notes/${noteId}`);
    } catch {
      router.push("/notes/create");
    }
  };

  return (
    <View className="px-4">
      <View className="flex-row items-center gap-2.5">
        {/* Note */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create note"
          onPress={handleCreateBlankNote}
          className="flex-1 active:opacity-75">
          <Card className="py-2 bg-transparent px-2 rounded-3xl items-center justify-center gap-1.5">
            <Plus size={20} color={colors.text} strokeWidth={2} />
            <Text className="text-xs font-medium text-text">Note</Text>
          </Card>
        </Pressable>

        {/* Checklist */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create checklist"
          onPress={handleCreateChecklistNote}
          className="flex-1 active:opacity-75">
          <Card className="py-2 bg-transparent px-2 rounded-3xl items-center justify-center gap-1.5">
            <CheckSquare size={19} color={colors.text} strokeWidth={1.9} />
            <Text className="text-xs font-medium text-text">Checklist</Text>
          </Card>
        </Pressable>

        {/* Audio */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Record voice memo"
          onPress={handleCreateAudioNote}
          className="flex-1 active:opacity-75">
          <Card className="py-2 bg-transparent px-2 rounded-3xl items-center justify-center gap-1.5">
            <Mic size={19} color={colors.text} strokeWidth={1.9} />
            <Text className="text-xs font-medium text-text">Audio</Text>
          </Card>
        </Pressable>

        {/* Photo */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          onPress={handleCreatePhotoNote}
          className="flex-1 active:opacity-75">
          <Card className="py-2 bg-transparent px-2 rounded-3xl items-center justify-center gap-1.5">
            <Camera size={19} color={colors.text} strokeWidth={1.9} />
            <Text className="text-xs font-medium text-text">Photo</Text>
          </Card>
        </Pressable>
      </View>
    </View>
  );
}
