import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Info,
  Pin,
  Plus,
  Share2,
  Trash2,
  X,
} from 'lucide-react-native';

import { NoteAccessoryBar } from '@/components/notes/note-accessory-bar';
import { NoteInfoSheet } from '@/components/notes/note-info-sheet';
import { useTheme } from '@/hooks/use-theme';
import {
  softDeleteNote,
  togglePinNote,
  updateNote,
  useLiveNote,
} from '@/lib/queries/notes';

function formatEditTime(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function NoteDetailScreen() {
  const colors = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: note } = useLiveNote(id as string);

  // Local state for snappy, lag-free typing
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [newTagInputVisible, setNewTagInputVisible] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  const hasInitialized = useRef(false);
  const contentInputRef = useRef<TextInput>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize state once from loaded SQLite note
  useEffect(() => {
    if (note && !hasInitialized.current) {
      setTitle(note.title);
      setContent(note.content);
      setIsPinned(note.isPinned);
      setIsArchived(note.isArchived);

      try {
        const parsed = JSON.parse(note.tags || '[]');
        if (Array.isArray(parsed)) setTags(parsed);
      } catch {
        setTags([]);
      }

      hasInitialized.current = true;
    }
  }, [note]);

  // Debounced auto-save function
  const triggerAutoSave = useCallback(
    (newTitle: string, newContent: string, newTags: string[]) => {
      if (!id) return;
      setIsSaving(true);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await updateNote(id, {
            title: newTitle,
            content: newContent,
            tags: newTags,
          });
        } catch {
          // Non-blocking auto-save error
        } finally {
          setIsSaving(false);
        }
      }, 400);
    },
    [id]
  );

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutoSave(newTitle, content, tags);
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    triggerAutoSave(title, newContent, tags);
  };

  const handleTogglePin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    if (id) {
      try {
        await togglePinNote(id);
      } catch {
        setIsPinned(!nextPinned);
      }
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: title.trim() || 'Untitled Note',
        message: `${title}\n\n${content}`,
      });
    } catch {
      // Ignored
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return;
          try {
            await softDeleteNote(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Alert.alert('Error', 'Could not delete note');
          }
        },
      },
    ]);
  };

  const handleAddTag = () => {
    const trimmed = newTagText.trim().toLowerCase().replace(/^#/, '');
    if (trimmed && !tags.includes(trimmed)) {
      const updatedTags = [...tags, trimmed];
      setTags(updatedTags);
      setNewTagText('');
      setNewTagInputVisible(false);
      triggerAutoSave(title, content, updatedTags);
      Haptics.selectionAsync();
    } else {
      setNewTagInputVisible(false);
      setNewTagText('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    setTags(updatedTags);
    triggerAutoSave(title, content, updatedTags);
  };

  const handleInsertSnippet = (snippet: string) => {
    setContent((prev) => {
      const updated = prev + snippet;
      triggerAutoSave(title, updated, tags);
      return updated;
    });
    contentInputRef.current?.focus();
  };

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);

  if (!note && !hasInitialized.current) {
    return (
      <View className="flex-1 bg-background pt-safe pb-safe justify-center items-center">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background pt-safe pb-safe w-full max-w-[800px] mx-auto">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Navigation Bar */}
        <View className="h-12 flex-row items-center justify-between px-3.5 border-b border-border bg-background">
          {/* Back Button */}
          <Pressable
            className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-[36px] min-w-[36px]"
            onPress={() => router.back()}
            hitSlop={8}>
            <ArrowLeft size={20} color={colors.text} />
          </Pressable>

          {/* Center Save Indicator */}
          <Text className="text-[11px] font-medium tracking-wide text-text-secondary">
            {isSaving ? 'Saving...' : 'Saved'}
          </Text>

          {/* Right Header Action Icons */}
          <View className="flex-row items-center gap-2">
            {/* Pin Toggle */}
            <Pressable
              className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-[36px] min-w-[36px]"
              onPress={handleTogglePin}
              hitSlop={8}>
              <Pin
                size={18}
                color={isPinned ? colors.primary : colors.textSecondary}
                fill={isPinned ? colors.primary : 'transparent'}
                style={{ transform: [{ rotate: '45deg' }] }}
              />
            </Pressable>

            {/* Share */}
            <Pressable
              className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-[36px] min-w-[36px]"
              onPress={handleShare}
              hitSlop={8}>
              <Share2 size={18} color={colors.textSecondary} />
            </Pressable>

            {/* Details / Info Sheet */}
            <Pressable
              className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-[36px] min-w-[36px]"
              onPress={() => {
                Haptics.selectionAsync();
                setInfoSheetVisible(true);
              }}
              hitSlop={8}>
              <Info size={18} color={colors.textSecondary} />
            </Pressable>

            {/* Delete */}
            <Pressable
              className="p-1.5 rounded-lg justify-center items-center active:opacity-70 min-h-[36px] min-w-[36px]"
              onPress={handleDelete}
              hitSlop={8}>
              <Trash2 size={18} color="#ef4444" />
            </Pressable>
          </View>
        </View>

        {/* Note Writing Canvas */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-4 pb-10"
          keyboardShouldPersistTaps="handled">
          {/* Metadata Row: Last edit date and word count */}
          <Text className="text-xs font-mono mb-2 text-text-secondary">
            {formatEditTime(note?.updatedAt)} · {wordCount} words
          </Text>

          {/* Title Input */}
          <TextInput
            className="text-2xl font-bold leading-8 tracking-tight py-1 mb-2.5 text-text"
            placeholder="Title"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={handleTitleChange}
            returnKeyType="next"
            onSubmitEditing={() => contentInputRef.current?.focus()}
            multiline={false}
          />

          {/* Tags Row */}
          <View className="flex-row flex-wrap items-center gap-1.5 mb-4">
            {tags.map((tag) => (
              <Pressable
                key={tag}
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border bg-background-element active:opacity-80"
                onPress={() => handleRemoveTag(tag)}>
                <Text className="text-xs font-medium text-text">
                  #{tag}
                </Text>
                <X size={12} color={colors.textSecondary} />
              </Pressable>
            ))}

            {newTagInputVisible ? (
              <View className="flex-row items-center px-2 h-6.5 rounded-xl border border-primary bg-background-element">
                <Text className="text-xs text-text-secondary">#</Text>
                <TextInput
                  className="text-xs py-0 px-0.5 min-w-[40px] text-text"
                  placeholder="tag"
                  placeholderTextColor={colors.textSecondary}
                  value={newTagText}
                  onChangeText={setNewTagText}
                  autoFocus
                  onSubmitEditing={handleAddTag}
                  onBlur={handleAddTag}
                  returnKeyType="done"
                  autoCapitalize="none"
                />
              </View>
            ) : (
              <Pressable
                className="flex-row items-center gap-1 px-2.5 py-1 rounded-xl border border-dashed border-border bg-background-element active:opacity-70"
                onPress={() => {
                  Haptics.selectionAsync();
                  setNewTagInputVisible(true);
                }}>
                <Plus size={12} color={colors.textSecondary} />
                <Text className="text-xs font-medium text-text-secondary">
                  Tag
                </Text>
              </Pressable>
            )}
          </View>

          {/* Body Content Input */}
          <TextInput
            ref={contentInputRef}
            className="text-base leading-6 min-h-[240px] py-0 text-text"
            placeholder="Start typing..."
            placeholderTextColor={colors.textSecondary}
            value={content}
            onChangeText={handleContentChange}
            multiline
            textAlignVertical="top"
            scrollEnabled={false}
          />
        </ScrollView>

        {/* Keyboard Accessory Bar */}
        <NoteAccessoryBar
          onInsertSnippet={handleInsertSnippet}
          onOpenTagPrompt={() => setNewTagInputVisible(true)}
        />

        {/* Note Info Details Modal Sheet */}
        <NoteInfoSheet
          note={note ?? null}
          visible={infoSheetVisible}
          onClose={() => setInfoSheetVisible(false)}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
