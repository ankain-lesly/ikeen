import { useState, useMemo } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Search, StickyNote, Check } from 'lucide-react-native';
import { OptionSheet } from '@/components/ui/option-sheet';
import * as Haptics from '@/lib/haptics';
import { useTheme } from '@/hooks/use-theme';
import { useLiveNotes } from '@/lib/queries/notes';
import type { NoteSelect as Note } from '@/lib/types/notes';

export interface ScratchpadNotePickerSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  currentNoteId?: string | null;
  onSelectNote: (note: Note) => Promise<void>;
}

export function ScratchpadNotePickerSheet({
  isPresented,
  onDismiss,
  currentNoteId,
  onSelectNote,
}: ScratchpadNotePickerSheetProps) {
  const colors = useTheme();
  const [search, setSearch] = useState('');

  // Fetch all user notes (including archived, excluding deleted)
  const { data: notes = [] } = useLiveNotes({
    includeArchived: true,
    includeDeleted: false,
    withBlocks: false,
  });

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.content && n.content.toLowerCase().includes(q))
    );
  }, [notes, search]);

  const handleSelect = async (note: Note) => {
    Haptics.selectionAsync();
    await onSelectNote(note);
    onDismiss();
  };

  return (
    <OptionSheet
      isPresented={isPresented}
      onDismiss={onDismiss}
      snapPoints={['half', 'full']}
      title="Choose Scratchpad Note"
      matchHTMLContents={false}
      >
      <View className="w-full gap-3 pt-1">
        {/* Search input */}
        <View className="flex-row items-center bg-background-element border border-border/80 rounded-xl px-3 h-10 gap-2">
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            placeholder="Search notes..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-sm text-text font-normal"
            autoCorrect={false}
          />
        </View>

        {/* Note List */}
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24, gap: 8 }}
          ListEmptyComponent={
            <View className="py-8 items-center justify-center">
              <Text className="text-xs text-text-secondary">No notes found</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = item.id === currentNoteId;
            return (
              <Pressable
                onPress={() => handleSelect(item)}
                className={`p-3 rounded-xl border flex-row items-center justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border/70 bg-background-element active:bg-background-selected'
                }`}>
                <View className="flex-row items-center gap-3 flex-1 min-w-0 mr-2">
                  <View className="w-8 h-8 rounded-lg bg-background border border-border/60 items-center justify-center shrink-0">
                    <StickyNote size={15} color={isSelected ? colors.primary : colors.textSecondary} />
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-semibold text-text">
                      {item.title || 'Untitled Note'}
                    </Text>
                    {item.content ? (
                      <Text
                        numberOfLines={1}
                        className="text-xs text-text-secondary mt-0.5">
                        {item.content}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {isSelected ? (
                  <Check size={16} color={colors.primary} strokeWidth={2.4} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </View>
    </OptionSheet>
  );
}
