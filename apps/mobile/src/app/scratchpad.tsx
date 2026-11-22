import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Grid2X2, Plus, StickyNote } from 'lucide-react-native';
import * as Haptics from '@/lib/haptics';
import { useTheme } from '@/hooks/use-theme';
import { useLiveScratchpadNote } from '@/lib/queries/scratchpad';
import { NoteEditor } from '@/components/notes/note-editor';
import { ScratchpadNotePickerSheet } from '@/components/notes/scratchpad-note-picker-sheet';
import type { NoteSelect as Note } from '@/lib/types/notes';

export default function ScratchpadScreen() {
  const colors = useTheme();
  const router = useRouter();

  const {
    scratchpadNote,
    isLoading,
    createScratchpad,
    assignExistingNote,
    resetScratchpad,
  } = useLiveScratchpadNote();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createScratchpad();
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectExisting = async (note: Note) => {
    await assignExistingNote(note);
    setIsPickerOpen(false);
  };

  if (isLoading && !scratchpadNote) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // Initialized state: render the unified NoteEditor in scratchpad mode
  if (scratchpadNote) {
    return (
      <>
        <NoteEditor
          key={scratchpadNote.id}
          note={scratchpadNote}
          variant="scratchpad"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          scratchpadActions={{
            onChangeNote: () => setIsPickerOpen(true),
            onReset: resetScratchpad,
          }}
        />
        <ScratchpadNotePickerSheet
          isPresented={isPickerOpen}
          onDismiss={() => setIsPickerOpen(false)}
          currentNoteId={scratchpadNote.id}
          onSelectNote={handleSelectExisting}
        />
      </>
    );
  }

  // Uninitialized state: prompt user to create or select a note
  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="px-4 py-2 pt-safe flex-row items-center justify-between border-b border-border/60">
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          hitSlop={8}
          className="w-8 h-8 rounded-full items-center justify-center active:bg-background-element">
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <Text className="text-base font-semibold text-text">Scratchpad</Text>
        <View className="w-8" />
      </View>

      {/* Setup Hero Card */}
      <View className="flex-1 justify-center items-center px-6 pb-12">
        <View className="w-16 h-16 rounded-2xl items-center justify-center mb-6">
          <StickyNote size={42} strokeWidth={1} color={colors.primary} />
        </View>

        <Text className="text-2xl font-bold text-text text-center tracking-tight mb-2">
          Personal Workspace
        </Text>

        <Text className="text-sm text-text-secondary text-center leading-relaxed mb-8 max-w-[320px]">
          A quick, distraction-free space for dumping raw thoughts, outlines, and checklists. Automatically synced across all your devices without cluttering your main notes feed.
        </Text>

        {/* Action Buttons */}
        <View className="w-full max-w-75 gap-3">
          <Pressable
            disabled={isCreating}
            onPress={handleCreate}
            className="w-full h-12 rounded-2xl bg-primary flex-row items-center justify-center gap-2 active:opacity-90 shadow-sm">
            {isCreating ? (
              <ActivityIndicator size="small" color="#000000" />
            ) : (
              <>
                <Plus size={18} color="#000000" strokeWidth={2.4} />
                <Text className="text-black font-semibold text-sm">
                  Create Scratchpad Note
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setIsPickerOpen(true);
            }}
            className="w-full h-12 rounded-2xl border border-border/80 bg-background-element flex-row items-center justify-center gap-2 active:bg-background-selected">
            <Grid2X2 size={16} color={colors.textSecondary} />
            <Text className="text-text font-semibold text-sm">
              Choose Existing Note
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Note Picker Sheet */}
      <ScratchpadNotePickerSheet
        isPresented={isPickerOpen}
        onDismiss={() => setIsPickerOpen(false)}
        onSelectNote={handleSelectExisting}
      />
    </View>
  );
}
