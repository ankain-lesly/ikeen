import React, { useState } from "react";
import { View, Text, Pressable, Linking, Image } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  FileText,
  Search,
  Sparkles,
  Folder,
  Brain,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Pin,
  Archive,
  Globe,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";

export interface ToolPartProps {
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  state?: "call" | "partial-call" | "result" | "output-available" | string;
}

export function ChatToolPart({
  toolName,
  args = {},
  result,
  state,
}: ToolPartProps) {
  const colors = useTheme();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const isRunning = state === "call" || state === "partial-call";

  const handleOpenNote = (noteId: string) => {
    Haptics.selectionAsync();
    router.push({
      pathname: "/notes/[id]",
      params: { id: noteId },
    });
  };

  const handleOpenUrl = (url: string) => {
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
      return;
    }
    Haptics.selectionAsync();
    Linking.openURL(url);
  };

  // 1. Note Creation / Update Tool Card
  if (toolName === "createNote" || toolName === "updateNote") {
    const noteResult = result as {
      ok?: boolean;
      success?: boolean;
      note?: { id: string; title: string; folderId?: string | null };
      noteId?: string;
      title?: string;
    } | null;

    const note = noteResult?.note;
    const noteId = note?.id || noteResult?.noteId || (args.noteId as string);
    const title =
      note?.title ||
      noteResult?.title ||
      (args.title as string) ||
      "Untitled Note";

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <CheckCircle2 size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {toolName === "createNote" ? "Note Created" : "Note Updated"}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}
                ellipsizeMode="tail">
                {title}
              </Text>
            </View>
          </View>

          {noteId && !isRunning && (
            <Pressable
              onPress={() => handleOpenNote(noteId)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">Open</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // 2. Note Search Tool Card
  if (toolName === "searchNotes") {
    const searchResult = result as {
      count?: number;
      notes?: { id: string; title: string; folderName?: string }[];
    } | null;

    const query = (args.query as string) || "";
    const notes = searchResult?.notes || [];
    const count = searchResult?.count ?? notes.length;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <Pressable
          onPress={() => setIsExpanded(!isExpanded)}
          className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              <Search size={14} color={colors.textSecondary} />
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isRunning
                  ? "Searching Notes..."
                  : `Found ${count} Note${count === 1 ? "" : "s"}`}
              </Text>
              {query ? (
                <Text
                  className="text-xs text-text-secondary italic"
                  numberOfLines={1}>
                  &quot;{query}&quot;
                </Text>
              ) : null}
            </View>
          </View>

          {notes.length > 0 && (
            <View className="p-1">
              {isExpanded ? (
                <ChevronUp size={15} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={15} color={colors.textSecondary} />
              )}
            </View>
          )}
        </Pressable>

        {isExpanded && notes.length > 0 && (
          <View className="mt-2.5 pt-2 border-t border-border/60 gap-1.5">
            {notes.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => handleOpenNote(n.id)}
                className="flex-row items-center justify-between p-2 rounded-xl bg-background border border-border/40 active:bg-background-selected">
                <View className="flex-row items-center gap-2 flex-1 min-w-0 mr-2">
                  <FileText size={13} color={colors.textSecondary} />
                  <Text
                    className="text-xs font-medium text-text flex-1 min-w-0"
                    numberOfLines={1}>
                    {n.title}
                  </Text>
                </View>
                {n.folderName && (
                  <Text className="text-[10px] text-text-secondary">
                    {n.folderName}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  // 3. Context Memory Recorded
  if (toolName === "recordMemory") {
    const memory = (args.content as string) || "";
    return (
      <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center gap-2">
        <Brain size={13} color={colors.primary} />
        <Text
          className="text-xs text-text-secondary flex-1 min-w-0"
          numberOfLines={2}>
          Saved context: <Text className="text-text font-medium">{memory}</Text>
        </Text>
      </View>
    );
  }

  // 4. Organize Note Tool
  if (toolName === "organizeNote") {
    const organizeResult = result as {
      ok?: boolean;
      noteId?: string;
      title?: string;
      folderId?: string | null;
      folderName?: string | null;
    } | null;

    const noteId = organizeResult?.noteId || (args.noteId as string);
    const title = organizeResult?.title || (args.title as string);
    const folderName = organizeResult?.folderName;
    const isUnfiled =
      args.folderId === null || organizeResult?.folderId === null;

    let label = "Note Organized";
    let description = "Organized note";
    if (isUnfiled) {
      label = "Folder Unassigned";
      description = title
        ? `Moved "${title}" to general workspace`
        : "Moved note to general workspace";
    } else if (folderName) {
      label = "Organized into Folder";
      description = title
        ? `Moved "${title}" into ${folderName}`
        : `Organized note into ${folderName}`;
    } else if (title) {
      description = `Organized "${title}"`;
    }

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <Folder size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {label}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}
                ellipsizeMode="tail">
                {description}
              </Text>
            </View>
          </View>

          {noteId && !isRunning && (
            <Pressable
              onPress={() => handleOpenNote(noteId)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">Open</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // 5. Create Folder Tool
  if (toolName === "createFolder") {
    const folderResult = result as {
      ok?: boolean;
      folder?: { id: string; name: string; color?: string; icon?: string };
      name?: string;
      alreadyExisted?: boolean;
    } | null;

    const folderName =
      folderResult?.folder?.name ||
      folderResult?.name ||
      (args.name as string) ||
      "New Folder";
    const folderColor =
      folderResult?.folder?.color || (args.color as string) || colors.primary;
    const isAlreadyExisted = folderResult?.alreadyExisted;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View
              style={{
                backgroundColor: `${folderColor}20`,
                borderColor: `${folderColor}40`,
              }}
              className="w-7 h-7 rounded-lg border items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={folderColor} />
              ) : (
                <Folder size={14} color={folderColor} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isAlreadyExisted ? "Existing Folder Linked" : "Folder Created"}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}>
                {folderName}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // 6. Update Folder Tool
  if (toolName === "updateFolder") {
    const folderResult = result as {
      ok?: boolean;
      folder?: { id: string; name: string; color?: string; icon?: string };
      name?: string;
    } | null;

    const folderName =
      folderResult?.folder?.name ||
      folderResult?.name ||
      (args.name as string) ||
      "Folder";
    const folderColor =
      folderResult?.folder?.color || (args.color as string) || colors.primary;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
          <View
            style={{
              backgroundColor: `${folderColor}20`,
              borderColor: `${folderColor}40`,
            }}
            className="w-7 h-7 rounded-lg border items-center justify-center">
            {isRunning ? (
              <Loader2 size={14} color={folderColor} />
            ) : (
              <Folder size={14} color={folderColor} />
            )}
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
              Folder Updated
            </Text>
            <Text className="text-xs font-semibold text-text" numberOfLines={1}>
              {folderName}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // 7. Pin Note Tool
  if (toolName === "pinNote") {
    const noteResult = result as {
      ok?: boolean;
      noteId?: string;
      title?: string;
      isPinned?: boolean;
      note?: { id: string; title: string; isPinned: boolean };
    } | null;
    const noteId =
      noteResult?.note?.id || noteResult?.noteId || (args.noteId as string);
    const title =
      noteResult?.note?.title ||
      noteResult?.title ||
      (args.title as string) ||
      "Note";
    const isPinned =
      noteResult?.note?.isPinned !== undefined
        ? noteResult.note.isPinned
        : noteResult?.isPinned !== undefined
          ? noteResult.isPinned
          : args.isPinned !== false;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <Pin size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isPinned ? "Note Pinned" : "Note Unpinned"}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}
                ellipsizeMode="tail">
                {title}
              </Text>
            </View>
          </View>

          {noteId && !isRunning && (
            <Pressable
              onPress={() => handleOpenNote(noteId)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">Open</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // 8. Archive Note Tool
  if (toolName === "archiveNote") {
    const noteResult = result as {
      ok?: boolean;
      noteId?: string;
      title?: string;
      isArchived?: boolean;
      note?: { id: string; title: string; isArchived: boolean };
    } | null;
    const noteId =
      noteResult?.note?.id || noteResult?.noteId || (args.noteId as string);
    const title =
      noteResult?.note?.title ||
      noteResult?.title ||
      (args.title as string) ||
      "Note";
    const isArchived =
      noteResult?.note?.isArchived !== undefined
        ? noteResult.note.isArchived
        : noteResult?.isArchived !== undefined
          ? noteResult.isArchived
          : args.isArchived !== false;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <Archive size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isArchived ? "Note Archived" : "Note Restored"}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}
                ellipsizeMode="tail">
                {title}
              </Text>
            </View>
          </View>

          {noteId && !isRunning && (
            <Pressable
              onPress={() => handleOpenNote(noteId)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">Open</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // 9. List Folders Tool
  if (toolName === "listFolders") {
    const listResult = result as {
      ok?: boolean;
      count?: number;
      folders?: {
        id: string;
        name: string;
        color?: string;
        noteCount?: number;
      }[];
    } | null;
    const count = listResult?.count ?? listResult?.folders?.length ?? 0;
    const query = (args.query as string) || "";

    return (
      <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center gap-2">
        {isRunning ? (
          <Loader2 size={13} color={colors.primary} />
        ) : (
          <Folder size={13} color={colors.primary} />
        )}
        <Text className="text-xs text-text flex-1 min-w-0" numberOfLines={1}>
          {isRunning
            ? "Checking workspace folders..."
            : query
              ? `Found ${count} folder${count === 1 ? "" : "s"} matching "${query}"`
              : `Loaded ${count} workspace folder${count === 1 ? "" : "s"}`}
        </Text>
      </View>
    );
  }

  // 10. List Recent Notes Tool
  if (toolName === "listRecentNotes") {
    const listResult = result as {
      ok?: boolean;
      count?: number;
      notes?: { id: string; title: string; isPinned?: boolean }[];
    } | null;
    const count = listResult?.count ?? listResult?.notes?.length ?? 0;
    const pinnedOnly = Boolean(args.pinnedOnly);

    return (
      <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center gap-2">
        {isRunning ? (
          <Loader2 size={13} color={colors.primary} />
        ) : (
          <FileText size={13} color={colors.primary} />
        )}
        <Text className="text-xs text-text flex-1 min-w-0" numberOfLines={1}>
          {isRunning
            ? "Reading recent workspace notes..."
            : pinnedOnly
              ? `Loaded ${count} pinned note${count === 1 ? "" : "s"}`
              : `Loaded ${count} recent note${count === 1 ? "" : "s"}`}
        </Text>
      </View>
    );
  }

  // 11. Get Note Details Tool
  if (toolName === "getNoteDetails") {
    const detailResult = result as {
      ok?: boolean;
      note?: { id: string; title: string };
    } | null;
    const noteId = detailResult?.note?.id || (args.noteId as string);
    const title = detailResult?.note?.title || "Note details";

    return (
      <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1 min-w-0 mr-2">
          {isRunning ? (
            <Loader2 size={13} color={colors.primary} />
          ) : (
            <FileText size={13} color={colors.primary} />
          )}
          <Text className="text-xs text-text flex-1 min-w-0" numberOfLines={1}>
            {isRunning ? "Reading note..." : `Inspected "${title}"`}
          </Text>
        </View>
        {noteId && !isRunning && (
          <Pressable
            onPress={() => handleOpenNote(noteId)}
            className="px-2 py-1 rounded-md bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
            <Text className="text-[11px] font-medium text-primary">Open</Text>
            <ExternalLink size={10} color={colors.primary} />
          </Pressable>
        )}
      </View>
    );
  }

  if (toolName === "webSearch") {
    const searchResult = result as {
      results?: { title: string; url: string }[];
    } | null;
    const query = (args.query as string) || "";
    const hits = searchResult?.results || [];
    const count = hits.length;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <Pressable
          onPress={() => hits.length > 0 && setIsExpanded(!isExpanded)}
          className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <Globe size={14} color={colors.textSecondary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isRunning
                  ? "Searching the web..."
                  : `Searched the web${count > 0 ? ` · ${count}` : ""}`}
              </Text>
              {query ? (
                <Text
                  className="text-xs text-text-secondary italic"
                  numberOfLines={1}>
                  &quot;{query}&quot;
                </Text>
              ) : null}
            </View>
          </View>

          {hits.length > 0 && (
            <View className="p-1">
              {isExpanded ? (
                <ChevronUp size={15} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={15} color={colors.textSecondary} />
              )}
            </View>
          )}
        </Pressable>

        {isExpanded && hits.length > 0 && (
          <View className="mt-2.5 pt-2 border-t border-border/60 gap-1.5">
            {hits.map((hit) => (
              <Pressable
                key={hit.url}
                onPress={() => handleOpenUrl(hit.url)}
                className="flex-row items-center justify-between p-2 rounded-xl bg-background border border-border/40 active:bg-background-selected">
                <View className="flex-row items-center gap-2 flex-1 min-w-0 mr-2">
                  <Globe size={13} color={colors.textSecondary} />
                  <Text
                    className="text-xs font-medium text-text flex-1 min-w-0"
                    numberOfLines={1}>
                    {hit.title}
                  </Text>
                </View>
                <ExternalLink size={11} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (toolName === "readWebPage") {
    const pageResult = result as {
      ok?: boolean;
      url?: string;
      title?: string;
    } | null;
    const url = pageResult?.url || (args.url as string) || "";
    const title = pageResult?.title || url || "Web page";

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <Globe size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isRunning ? "Reading page..." : "Read page"}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}
                ellipsizeMode="tail">
                {title}
              </Text>
            </View>
          </View>

          {url && !isRunning && (
            <Pressable
              onPress={() => handleOpenUrl(url)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">Open</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // 14. Generate Image Tool Card
  if (toolName === "generateImageKeen" || toolName === "ikeen_generate_image") {
    const imgResult = result as {
      ok?: boolean;
      url?: string;
      description?: string;
      mimeType?: string;
      error?: string;
    } | null;

    const description =
      imgResult?.description ||
      (args.description as string) ||
      "Generating image...";
    const imageUrl = imgResult?.url;
    const isError = imgResult?.ok === false || !!imgResult?.error;
    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <Sparkles size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isRunning
                  ? "Generating Image..."
                  : isError
                    ? "Generation Failed"
                    : "Image Generated"}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={2}
                ellipsizeMode="tail">
                {description}
              </Text>
            </View>
          </View>

          {imageUrl && !isRunning && (
            <Pressable
              onPress={() => handleOpenUrl(imageUrl)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">View</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {imageUrl && !isRunning && (
          <View className="mt-3 rounded-xl overflow-hidden border border-border/50 bg-background aspect-video">
            <Image
              source={{ uri: imageUrl }}
              className="w-full h-62"
              resizeMode="cover"
            />
          </View>
        )}

        {isError && (
          <Text className="mt-1.5 text-xs text-red-500">
            {imgResult?.error || "Failed to generate image"}
          </Text>
        )}
      </View>
    );
  }

  // 15. Attach Image Tool Card
  if (toolName === "attachImage" || toolName === "ikeen_attach_image") {
    const attachResult = result as {
      ok?: boolean;
      noteId?: string;
      url?: string;
      caption?: string;
    } | null;

    const noteId = attachResult?.noteId || (args.noteId as string);
    const caption =
      attachResult?.caption ||
      (args.caption as string) ||
      (args.name as string) ||
      "Image attached to note";

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <CheckCircle2 size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isRunning ? "Attaching Image..." : "Image Attached"}
              </Text>
              <Text
                className="text-xs font-semibold text-text"
                numberOfLines={1}
                ellipsizeMode="tail">
                {caption}
              </Text>
            </View>
          </View>

          {noteId && !isRunning && (
            <Pressable
              onPress={() => handleOpenNote(noteId)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">Open</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const connectUrl = findHttpsUrl(result) ?? findHttpsUrl(args);
  if (connectUrl) {
    const isConnectLink =
      /composio\.dev/i.test(connectUrl) || /COMPOSIO_/i.test(toolName);

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg bg-background border border-border/60 items-center justify-center">
              {isRunning ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <ExternalLink size={14} color={colors.primary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {isRunning
                  ? "Working…"
                  : isConnectLink
                    ? "Connect app"
                    : "Open link"}
              </Text>
              <Text className="text-xs text-text-secondary" numberOfLines={1}>
                {isConnectLink
                  ? "Open the link to authorize this app"
                  : connectUrl}
              </Text>
            </View>
          </View>
          {!isRunning && (
            <Pressable
              onPress={() => handleOpenUrl(connectUrl)}
              className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
              <Text className="text-xs font-medium text-primary">Open</Text>
              <ExternalLink size={11} color={colors.primary} />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  // Generic Tool Fallback
  return (
    <View className="my-1 px-3 py-1.5 rounded-xl bg-background-element border border-border/60 flex-row items-center gap-2">
      <Sparkles size={12} color={colors.primary} />
      <Text className="text-[11px] text-text-secondary flex-1 min-w-0">
        {isRunning ? "Working…" : "Done"}
      </Text>
    </View>
  );
}

function findHttpsUrl(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) {
    return null;
  }

  if (typeof value === "string") {
    const match = value.match(/https:\/\/[^\s"'<>]+/);
    return match?.[0] ?? null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findHttpsUrl(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      const found = findHttpsUrl(nested, depth + 1);
      if (found) {
        return found;
      }
    }
  }

  return null;
}
