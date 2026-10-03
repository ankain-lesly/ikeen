import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
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
import { router, useNavigation } from "expo-router";
import * as Haptics from "@/lib/haptics";
import {
  ChevronLeft,
  Folder,
  Pin,
  Plus,
  Sparkles,
  X,
} from "lucide-react-native";
import { NoteBottomToolBar } from "@/components/notes/note-accessory-bar";
import { NoteInfoSheet } from "@/components/notes/note-info-sheet";
import { useTheme } from "@/hooks/use-theme";
import { toast } from "@/lib/toast";
import {
  createNote,
  moveNoteToFolder,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  updateNote,
} from "@/lib/queries/notes";
import { useLiveFolder } from "@/lib/queries/folders";
import type { Note } from "@/lib/types/notes";
import NotesDetailDropdown from "@/components/notes/notes-detail-dropdown";
import { MoveToFolderSheet } from "@/components/notes/move-to-folder-sheet";
import { formatDate } from "@repo/utils/date";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { scheduleOnRN } from "react-native-worklets";
import { KeyboardGradualAnimation } from "@/components/keyboard-gradual-animation";
import {
  MarkdownBody,
  MarkdownEditor,
  type MarkdownEditorHandle,
  type MarkdownFormatAction,
} from "@/components/markdown";

export function NoteEditor({ note }: { note?: Note }) {
  const colors = useTheme();

  // Local state initialized directly from loaded note - no effect or cascading renders
  const [id, setId] = useState(note?.id);
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [tags, setTags] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(note?.tags || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [isPinned, setIsPinned] = useState(!!note?.isPinned);
  const [isArchived, setIsArchived] = useState(!!note?.isArchived);
  const [isSaving, setIsSaving] = useState(false);
  const [infoSheetVisible, setInfoSheetVisible] = useState(false);
  const [isMoveFolderSheetVisible, setIsMoveFolderSheetVisible] =
    useState(false);
  const [newTagInputVisible, setNewTagInputVisible] = useState(false);
  const [newTagText, setNewTagText] = useState("");

  const { data: currentFolder } = useLiveFolder(note?.folderId || "");

  const isNewDraft = (!note?.title && !note?.content) || !id;
  const [isEditing, setIsEditing] = useState(isNewDraft);
  const [editorDefaultValue, setEditorDefaultValue] = useState(content);
  const isEditingRef = useRef(isEditing);
  const leavingRef = useRef(false);
  const navigation = useNavigation();

  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<MarkdownEditorHandle>(null);
  const tagInputRef = useRef<TextInput>(null);
  const latestNoteRef = useRef({ title, content, tags });
  const hasEditedRef = useRef(false);
  const isDeletedRef = useRef(false);
  const idRef = useRef(note?.id);
  const creatingRef = useRef<Promise<string> | null>(null);
  const isPinnedRef = useRef(isPinned);
  const isArchivedRef = useRef(isArchived);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    latestNoteRef.current = { title, content, tags };
  }, [title, content, tags]);

  useEffect(() => {
    idRef.current = id;
  }, [id]);

  useEffect(() => {
    isPinnedRef.current = isPinned;
    isArchivedRef.current = isArchived;
  }, [isPinned, isArchived]);

  const saveNote = useCallback(
    async (
      next?: { title: string; content: string; tags: string[] },
      options?: { silent?: boolean; commitId?: boolean },
    ) => {
      if (next) {
        latestNoteRef.current = next;
      }
      if (isDeletedRef.current || !hasEditedRef.current) return;

      const snapshot = latestNoteRef.current;
      const isEmpty =
        snapshot.title.trim().length === 0 &&
        snapshot.content.trim().length === 0 &&
        snapshot.tags.length === 0;
      if (isEmpty) return;

      const silent = options?.silent === true;
      const commitId = options?.commitId !== false;
      if (!silent) setIsSaving(true);
      try {
        const startedCreate = !idRef.current && !creatingRef.current;
        if (!idRef.current) {
          if (!creatingRef.current) {
            creatingRef.current = createNote({
              title: snapshot.title,
              content: snapshot.content,
              tags: snapshot.tags,
              isPinned: isPinnedRef.current,
              isArchived: isArchivedRef.current,
            })
              .then((created) => {
                idRef.current = created.id;
                if (commitId) setId(created.id);
                return created.id;
              })
              .finally(() => {
                creatingRef.current = null;
              });
          }
          await creatingRef.current;
        }

        const savedId = idRef.current;
        const latest = latestNoteRef.current;
        const unchanged =
          latest.title === snapshot.title &&
          latest.content === snapshot.content &&
          latest.tags === snapshot.tags;
        if (savedId && !(startedCreate && unchanged)) {
          await updateNote(savedId, {
            title: latest.title,
            content: latest.content,
            tags: latest.tags,
          });
        }
        hasEditedRef.current = false;
      } catch {
        // Non-blocking save error
      } finally {
        if (!silent) setIsSaving(false);
      }
    },
    [],
  );

  const saveNoteRef = useRef(saveNote);
  useEffect(() => {
    saveNoteRef.current = saveNote;
  }, [saveNote]);

  useEffect(() => {
    return () => {
      void saveNoteRef.current(undefined, { silent: true, commitId: false }).catch((err) => {
        console.error("Failed to save note on unmount:", err);
      });
    };
  }, []);

  const flushEditorMarkdown = useCallback(async () => {
    if (!isEditingRef.current) return;
    try {
      const markdown = await contentInputRef.current?.getMarkdown();
      if (markdown == null || markdown === latestNoteRef.current.content) return;
      hasEditedRef.current = true;
      latestNoteRef.current = { ...latestNoteRef.current, content: markdown };
      setContent(markdown);
    } catch {
      // Keep the last onChangeMarkdown snapshot.
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "background") return;
      void (async () => {
        await flushEditorMarkdown();
        await saveNoteRef.current(undefined, { silent: true });
      })();
    });
    return () => subscription.remove();
  }, [flushEditorMarkdown]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (leavingRef.current || !isEditingRef.current) return;
      e.preventDefault();
      leavingRef.current = true;
      void (async () => {
        try {
          await flushEditorMarkdown();
          await saveNoteRef.current(undefined, {
            silent: true,
            commitId: false,
          });
        } finally {
          navigation.dispatch(e.data.action);
        }
      })();
    });
    return unsubscribe;
  }, [navigation, flushEditorMarkdown]);

  const [focusTarget, setFocusTarget] = useState<"title" | "content" | null>(
    null,
  );

  const startEditing = useCallback(
    (target: "title" | "content" = "content") => {
      setEditorDefaultValue(content);
      setFocusTarget(target);
      setIsEditing(true);
    },
    [content],
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
    await flushEditorMarkdown();
    const snapshot = latestNoteRef.current;
    setIsEditing(false);
    if (hasEditedRef.current) {
      await saveNote({
        title: snapshot.title,
        content: snapshot.content,
        tags: snapshot.tags,
      });
      toast.success("Note saved");
    }
  }, [flushEditorMarkdown, saveNote]);

  const handleTitleChange = (newTitle: string) => {
    hasEditedRef.current = true;
    latestNoteRef.current = { ...latestNoteRef.current, title: newTitle };
    setTitle(newTitle);
  };

  const handleContentChange = useCallback((newContent: string) => {
    hasEditedRef.current = true;
    latestNoteRef.current = { ...latestNoteRef.current, content: newContent };
    setContent(newContent);
  }, []);

  const formatContent = useCallback((action: MarkdownFormatAction) => {
    contentInputRef.current?.format(action);
  }, []);

  const openTagPrompt = useCallback(() => {
    setNewTagInputVisible(true);
  }, []);

  const editContent = useCallback(() => {
    startEditing("content");
  }, [startEditing]);

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

  const handleShare = useCallback(async () => {
    const snapshot = latestNoteRef.current;
    try {
      await Share.share({
        title: snapshot.title.trim() || "Untitled Note",
        message: `${snapshot.title}\n\n${snapshot.content}`,
      });
    } catch {
      // Ignored
    }
  }, []);

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
      hasEditedRef.current = true;
      void saveNote({ title, content, tags: updatedTags });
      Haptics.selectionAsync();
      tagInputRef?.current?.focus()
    } else {
      // setNewTagInputVisible(false);
      setNewTagText("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updatedTags = tags.filter((t) => t !== tagToRemove);
    setTags(updatedTags);
    hasEditedRef.current = true;
    void saveNote({ title, content, tags: updatedTags });
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
      {/* <KeyboardAwareScrollView
        bottomOffset={62}
        // contentContainerStyle={styles.container}
        > */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View className="flex-1 bg-background pt-safe w-full max-w-200 mx-auto">
          {/* Navigation Bar */}
          <View className="h-12 flex-row items-center justify-between px-3.5">
            {/* Back Button */}
            <Pressable
              className="p-1.5 flex-row rounded-lg justify-center items-center active:opacity-70 min-h-9 gap-2"
              onPress={() => router.back()}
              hitSlop={8}>
              <ChevronLeft size={20} color={colors.text} />
              <Text className="text-text text-base">Notes</Text>
            </Pressable>

            {/* Center Save / Mode Indicator */}
            {/* <Text className="text-[11px] font-medium tracking-wide text-text-secondary">
            {isEditing ? (isSaving ? "Saving..." : "Editing") : "Saved"}
          </Text> */}

            {/* Right Header Action Icons */}
            <View className="flex-row items-center gap-2">
              {/* Brainstorm with iKeen */}
              <Pressable
                className="p-2 rounded-lg justify-center items-center active:opacity-70 min-h-9 min-w-9"
                onPress={() => {
                  void (async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await flushEditorMarkdown();
                    const snapshot = latestNoteRef.current;
                    router.push({
                      pathname: "/agent",
                      params: {
                        prompt: `Let's brainstorm on my note "${snapshot.title || "Untitled Note"}":\n\n${snapshot.content.slice(0, 300)}`,
                      },
                    });
                  })();
                }}
                hitSlop={8}>
                <Sparkles size={18} color={colors.primary} />
              </Pressable>

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
                isDeleted={false}
                noteId={id ?? ""}
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
                  {title || "Untitled note"}
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
                        ref={tagInputRef}
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
            showsVerticalScrollIndicator={false}
            className="flex-1"
            contentContainerClassName="px-5 pt-4"
            keyboardShouldPersistTaps="handled">
            {isEditing ? (
              <MarkdownEditor
                ref={contentInputRef}
                defaultValue={editorDefaultValue}
                placeholder="Start typing..."
                placeholderTextColor={colors.textSecondary}
                onChangeMarkdown={handleContentChange}
              />
            ) : content.trim() ? (
              <View className="w-full min-w-0 pb-24">
                <MarkdownBody source={content} />
              </View>
            ) : (
              <GestureDetector gesture={combinedGestures}>
                <View className="w-full min-w-0 pb-24">
                  <Text className="text-base leading-6 text-text-secondary">
                    Start typing...
                  </Text>
                </View>
              </GestureDetector>
            )}
          </ScrollView>

          {/* Accessory / Toolbar depending on mode */}
          <NoteBottomToolBar
            isEditing={isEditing}
            isSaving={isSaving}
            onFormat={formatContent}
            onOpenTagPrompt={openTagPrompt}
            onDismiss={handleDoneEditing}
            wordCount={wordCount}
            onStartEditing={editContent}
            onShare={handleShare}
            isPinned={isPinned}
            onTogglePin={handleTogglePin}
          />

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
            currentFolderId={note?.folderId}
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
        </View>
      </KeyboardAvoidingView>
      <KeyboardGradualAnimation />
      {/* </KeyboardAwareScrollView> */}
      {/* <KeyboardToolbar /> */}
    </>
  );
}
