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
import { ChevronLeft, Folder, Pin, Plus, X } from "lucide-react-native";
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
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";

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
  const [isMoveFolderSheetVisible, setIsMoveFolderSheetVisible] =
    useState(false);
  const [newTagInputVisible, setNewTagInputVisible] = useState(false);
  const [newTagText, setNewTagText] = useState("");

  const { data: currentFolder } = useLiveFolder(note.folderId || "");

  const isNewDraft = !note.title && !note.content;
  const [isEditing, setIsEditing] = useState(isNewDraft);

  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);
  const latestNoteRef = useRef({ title, content, tags });
  const hasEditedRef = useRef(false);
  const isDeletedRef = useRef(false);

  // Keep latest values in ref for unmount save
  useEffect(() => {
    latestNoteRef.current = { title, content, tags };
  }, [title, content, tags]);

  // Save changes on unmount or clean up empty draft note
  useEffect(() => {
    return () => {
      if (isDeletedRef.current) return;

      const {
        title: finalTitle,
        content: finalContent,
        tags: finalTags,
      } = latestNoteRef.current;
      const isEmpty =
        finalTitle.trim().length === 0 &&
        finalContent.trim().length === 0 &&
        finalTags.length === 0;

      if (isEmpty) {
        hardDeleteNote(id).catch((err) => {
          console.error("Failed to delete empty note on unmount:", err);
        });
        return;
      }

      if (hasEditedRef.current) {
        updateNote(id, {
          title: finalTitle,
          content: finalContent,
          tags: finalTags,
        }).catch((err) => {
          console.error("Failed to save note on unmount:", err);
        });

        toast.success("Note saved");
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

  const [focusTarget, setFocusTarget] = useState<"title" | "content" | null>(
    null,
  );

  const startEditing = useCallback(
    (target: "title" | "content" = "content") => {
      setFocusTarget(target);
      setIsEditing(true);
    },
    [],
  );

  useEffect(() => {
    if (isEditing && focusTarget) {
      const timer = setTimeout(() => {
        if (focusTarget === "title") {
          titleInputRef.current?.focus();
        } else {
          contentInputRef.current?.focus();
        }
        setFocusTarget(null);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing, focusTarget]);

  const handleDoneEditing = useCallback(async () => {
    Keyboard.dismiss();
    setIsEditing(false);
    if (hasEditedRef.current) {
      await saveNote(title, content, tags);
      toast.success("Note saved");
    }
  }, [saveNote, title, content, tags]);

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
          isDeletedRef.current = true;
          try {
            await softDeleteNote(id);
            toast.info("Note deleted");
            router.back();
          } catch {
            isDeletedRef.current = false;
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

  // Handle Tap Gestures
  const combinedGestures = useMemo(() => {
    const singleTap = Gesture.Tap();
    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        "worklet";
        scheduleOnRN(startEditing, "content");
      });

    return Gesture.Exclusive(doubleTap, singleTap);
  }, [startEditing]);

  return (
    <>
      <KeyboardAwareScrollView
        bottomOffset={62}
        // contentContainerStyle={styles.container}
        >
        <View className="flex-1 bg-background pt-safe pb-safe w-full max-w-200 mx-auto">
          {/* <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : undefined}> */}
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

            {/* Center Save / Mode Indicator */}
            {/* <Text className="text-[11px] font-medium tracking-wide text-text-secondary">
            {isEditing ? (isSaving ? "Saving..." : "Editing") : "Saved"}
          </Text> */}

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

              {/* Mode Toggle Button: "Edit" in View Mode, "Done" in Edit Mode */}
              {isEditing ? (
                <Pressable
                  className="px-3 py-2 justify-center items-center active:opacity-70 min-h-9"
                  onPress={handleDoneEditing}>
                  <Text className="text-base font-bold text-primary">Done</Text>
                </Pressable>
              ) : (
                <Pressable
                  className="px-3 py-2 justify-center items-center active:opacity-70 min-h-9"
                  onPress={() => startEditing("content")}>
                  <Text className="text-base font-semibold text-primary">
                    Edit
                  </Text>
                </Pressable>
              )}
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
                onMoveToFolder={() => setIsMoveFolderSheetVisible(true)}
              />
            </View>
          </View>

          {/* Metadata and Title */}
          <View className="px-5 pt-4">
            {/* Metadata Row: Last edit date, word count, and Folder Pill */}
            <View className="flex-row items-center gap-2 mb-2 flex-wrap">
              <Text className="text-xs font-mono text-text-secondary">
                {formatDate(note?.updatedAt)} · {wordCount} words
              </Text>
              <Pressable
                onPress={() => setIsMoveFolderSheetVisible(true)}
                hitSlop={4}
                className="flex-row items-center gap-1.5 px-2 py-0.5 rounded-md bg-background-element border border-border active:opacity-70">
                <Folder
                  size={11}
                  color={currentFolder?.color || colors.textSecondary}
                />
                <Text
                  className="text-[11px] font-semibold"
                  style={{
                    color: currentFolder?.color || colors.textSecondary,
                  }}>
                  {currentFolder ? currentFolder.name : "Unorganized"}
                </Text>
              </Pressable>
            </View>

            {/* Title Input */}
            {/* <Pressable onPress={handleCanvasDoubleTap}> */}
            {isEditing ? (
              <TextInput
                ref={titleInputRef}
                className="text-2xl font-bold leading-8 tracking-tight py-1 mb-2.5 text-text"
                placeholder={"Untitled note"}
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={handleTitleChange}
                returnKeyType="next"
                onSubmitEditing={() => contentInputRef.current?.focus()}
                multiline={false}
                editable={isEditing}
                pointerEvents={isEditing ? "auto" : "none"}
              />
            ) : (
              <GestureDetector gesture={combinedGestures}>
                <Text
                  className="text-2xl font-bold leading-8 tracking-tight py-1 mb-2.5 text-text"
                  // selectable
                >
                  {title}
                </Text>
              </GestureDetector>
            )}

            {/* Tags Row */}
            {tags.length > 0 || isEditing ? (
              <View className="flex-row flex-wrap items-center gap-1.5 mb-4">
                {tags.map((tag) =>
                  isEditing ? (
                    <Pressable
                      key={tag}
                      className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-xl border border-border bg-background-element active:opacity-80"
                      onPress={() => handleRemoveTag(tag)}>
                      <Text className="text-xs font-medium text-text">
                        #{tag}
                      </Text>
                      <X size={12} color={colors.textSecondary} />
                    </Pressable>
                  ) : (
                    <View
                      key={tag}
                      className="flex-row items-center px-2.5 py-1 rounded-xl border border-border bg-background-element">
                      <Text className="text-xs font-medium text-text">
                        #{tag}
                      </Text>
                    </View>
                  ),
                )}

                {isEditing &&
                  (newTagInputVisible ? (
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
                  ))}
              </View>
            ) : null}
          </View>

          {/* Note Writing / Reading Canvas */}
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-5 pt-4 pb-24"
            keyboardShouldPersistTaps="handled">
            {/* <Pressable
            onPress={handleCanvasDoubleTap}
            className="flex-1 min-h-60"> */}
            {/* Body Content Input */}

            {isEditing ? (
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
                editable={isEditing}
                pointerEvents={isEditing ? "auto" : "none"}
              />
            ) : (
              <GestureDetector gesture={combinedGestures}>
                <Text
                  className="text-base leading-6 min-h-60 py-0 text-text"
                  // selectable
                >
                  {content}
                </Text>
              </GestureDetector>
            )}
          </ScrollView>

          {/* Accessory / Toolbar depending on mode */}
          {isEditing ? (
            <Animated.View
              key="editing"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="flex-1 flex-row items-center">
              <NoteAccessoryBar
                onInsertSnippet={handleInsertSnippet}
                onOpenTagPrompt={() => setNewTagInputVisible(true)}
                onDismiss={handleDoneEditing}
              />
            </Animated.View>
          ) : (
            <Animated.View
              key="viewing"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
              className="flex-1 flex-row items-center justify-between">
              <NoteMinimalToolbar
                wordCount={wordCount}
                onStartEditing={() => startEditing("content")}
                onShare={handleShare}
                isPinned={isPinned}
                onTogglePin={handleTogglePin}
              />
            </Animated.View>
          )}

          {/* Note Info Details Modal Sheet */}
          <NoteInfoSheet
            note={note ?? null}
            visible={infoSheetVisible}
            folderName={currentFolder?.name}
            onClose={() => setInfoSheetVisible(false)}
            onOpenMoveToFolder={() => setIsMoveFolderSheetVisible(true)}
          />

          {/* Move to Folder Selector Sheet */}
          <MoveToFolderSheet
            isPresented={isMoveFolderSheetVisible}
            onDismiss={() => setIsMoveFolderSheetVisible(false)}
            currentFolderId={note.folderId}
            onSelectFolder={async (newFolderId) => {
              if (!id) return;
              try {
                await moveNoteToFolder(id, newFolderId);
                toast.success("Folder updated");
              } catch {
                toast.error("Failed to move note");
              }
            }}
          />
          {/* </KeyboardAvoidingView> */}
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar /> {/* optional: prev/next/done buttons */}
    </>
  );
}
