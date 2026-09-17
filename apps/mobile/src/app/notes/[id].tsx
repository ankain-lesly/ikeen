import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  ChevronLeft,
  Pin,
  Plus,
  X,
} from "lucide-react-native";

import { NoteAccessoryBar } from "@/components/notes/note-accessory-bar";
import { NoteInfoSheet } from "@/components/notes/note-info-sheet";
import { useTheme } from "@/hooks/use-theme";
import {
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  updateNote,
  useLiveNote,
} from "@/lib/queries/notes";
import type { Note } from "@/lib/types/notes";
import NotesDetailDropdown from "@/components/notes/notes-detail-dropdown";

function formatEditTime(isoDate?: string): string {
  if (!isoDate) return "";
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

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

  return <NoteEditor key={note.id} note={note} colors={colors} />;
}

function NoteEditor({
  note,
  colors,
}: {
  note: Note;
  colors: ReturnType<typeof useTheme>;
}) {
  const id = note.id;

  // Local state initialized directly from loaded note - no effect or cascading renders
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(note.tags || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isPinned, setIsPinned] = useState(note.isPinned);
  const [isArchived, setIsArchived] = useState(note.isArchived);
  const [isSaving, setIsSaving] = useState(false);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [newTagInputVisible, setNewTagInputVisible] = useState(false);
  const [newTagText, setNewTagText] = useState("");

  const contentInputRef = useRef<TextInput>(null);
  const latestNoteRef = useRef({ title, content, tags });
  const hasEditedRef = useRef(false);

  // Keep latest values in ref for unmount save
  useEffect(() => {
    latestNoteRef.current = { title, content, tags };
  }, [title, content, tags]);

  // Save changes on unmount
  useEffect(() => {
    return () => {
      if (hasEditedRef.current) {
        const { title: finalTitle, content: finalContent, tags: finalTags } =
          latestNoteRef.current;
        updateNote(id, {
          title: finalTitle,
          content: finalContent,
          tags: finalTags,
        }).catch((err) => {
          console.error("Failed to save note on unmount:", err);
        });
      }
    };
  }, [id]);

  // Explicit save function (called by Save button & tag updates)
  const saveNote = useCallback(
    async (newTitle: string, newContent: string, newTags: string[]) => {
      if (!id) return;
      setIsSaving(true);
      try {
        await updateNote(id, {
          title: newTitle,
          content: newContent,
          tags: newTags,
        });
        hasEditedRef.current = false;
      } catch {
        // Non-blocking save error
      } finally {
        setIsSaving(false);
      }
    },
    [id],
  );

  const handleTitleChange = (newTitle: string) => {
    hasEditedRef.current = true;
    setTitle(newTitle);
  };

  const handleContentChange = (newContent: string) => {
    hasEditedRef.current = true;
    setContent(newContent);
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
        title: title.trim() || "Untitled Note",
        message: `${title}\n\n${content}`,
      });
    } catch {
      // Ignored
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          try {
            await softDeleteNote(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          } catch {
            Alert.alert("Error", "Could not delete note");
          }
        },
      },
    ]);
  };

  const handleAddTag = () => {
    const trimmed = newTagText.trim().toLowerCase().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      const updatedTags = [...tags, trimmed];
      setTags(updatedTags);
      setNewTagText("");
      setNewTagInputVisible(false);
      saveNote(title, content, updatedTags);
      Haptics.selectionAsync();
    } else {
      setNewTagInputVisible(false);
      setNewTagText("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    setTags(updatedTags);
    saveNote(title, content, updatedTags);
  };

  const handleInsertSnippet = (snippet: string) => {
    hasEditedRef.current = true;
    setContent((prev) => prev + snippet);
    contentInputRef.current?.focus();
  };

  const wordCount = useMemo(() => {
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);

  return (
    <View className="flex-1 bg-background pt-safe pb-safe w-full max-w-200 mx-auto">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Navigation Bar */}
        <View className="h-12 flex-row items-center justify-between px-3.5">
          {/* Back Button */}
          <Pressable
            className="p-1.5 flex-row rounded-lg justify-center items-center active:opacity-70 min-h-9 gap-2"
            onPress={() => router.back()}
            hitSlop={8}>
            <ChevronLeft size={20} color={colors.text} />
            <Text className="text-text">Notes</Text>
          </Pressable>

          {/* Center Save Indicator */}
          <Text className="text-[11px] font-medium tracking-wide text-text-secondary">
            {isSaving ? "Saving..." : "Saved"}
          </Text>

          {/* Right Header Action Icons */}
          <View className="flex-row items-center gap-2">
            {/* Pin */}
            <Pressable
              className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
              onPress={handleTogglePin}>
              <Pin
                size={18}
                color={isPinned ? colors.primary : colors.text}
                fill={isPinned ? colors.primary : undefined}
              />
            </Pressable>

            {/* Save */}
            <Pressable
              className="px-3 py-2 justify-center items-center active:opacity-70 min-h-9"
              onPress={async () => await saveNote(title, content, tags)}>
              <Text className="text-base font-bold text-primary">Save</Text>
            </Pressable>
            {/* Dropdown */}
            <NotesDetailDropdown
              isPinned={isPinned}
              onTogglePin={handleTogglePin}
              isArchived={isArchived}
              onToggleArchive={async () => {
                setIsArchived(!isArchived);
                if (id) {
                  try {
                    await toggleArchiveNote(id);
                  } catch {
                    setIsArchived(!isArchived);
                  }
                }
              }}
              onDelete={handleDelete}
              onShare={handleShare}
              onShowInfo={() => setInfoSheetVisible(true)}
            />
          </View>
        </View>

        {/* Metadata and Title */}
        <View className="px-5 pt-4">
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
                <Text className="text-xs font-medium text-text">#{tag}</Text>
                <X size={12} color={colors.textSecondary} />
              </Pressable>
            ))}

            {newTagInputVisible ? (
              <View className="flex-row items-center px-2 h-6.5 rounded-xl border border-primary bg-background-element">
                <Text className="text-xs text-text-secondary">#</Text>
                <TextInput
                  className="text-xs py-0 px-0.5 min-w-10 text-text"
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
        </View>

        {/* Note Writing Canvas */}
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pt-4 pb-10"
          keyboardShouldPersistTaps="handled">
          {/* Body Content Input */}
          <TextInput
            ref={contentInputRef}
            className="text-base leading-6 min-h-60 py-0 text-text"
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
          onDismiss={() => {
            console.log("Exit Live Editing mode > View Mode");
          }}
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
