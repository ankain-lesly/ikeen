import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  Image,
  ActivityIndicator,
} from "react-native";
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
  Pin,
  Archive,
  Globe,
  type LucideIcon,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";

const Loader2 = ({size, color}:{size:number, color: string}) => <ActivityIndicator size={"small"} color={color} />

export interface ToolPartProps {
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
  state?: "call" | "partial-call" | "result" | "output-available" | string;
}

interface ToolActionCardProps {
  isRunning: boolean;
  icon: LucideIcon;
  iconColor?: string;
  tintColor?: string;
  label: string;
  title: string;
  titleLines?: number;
  subtitleItalic?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  children?: React.ReactNode;
}

function ToolActionCard({
  isRunning,
  icon: Icon,
  iconColor,
  tintColor,
  label,
  title,
  titleLines = 1,
  subtitleItalic = false,
  actionLabel = "Open",
  onAction,
  children,
}: ToolActionCardProps) {
  const colors = useTheme();
  const resolvedIconColor = iconColor || tintColor || colors.primary;

  return (
    <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
          <View
            className={`w-7 h-7 rounded-lg items-center justify-center`}>
            {isRunning ? (
              <Loader2 size={14} color={resolvedIconColor} />
            ) : (
              <Icon size={14} color={resolvedIconColor} />
            )}
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
              {label}
            </Text>
            <Text
              className={
                subtitleItalic
                  ? "text-xs text-text-secondary"
                  : "text-xs font-semibold text-text"
              }
              numberOfLines={titleLines}
              ellipsizeMode="tail">
              {title}
            </Text>
          </View>
        </View>

        {onAction && !isRunning && (
          <Pressable
            onPress={onAction}
            className="px-2.5 py-1.5 rounded-lg bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
            <Text className="text-xs font-medium text-primary">
              {actionLabel}
            </Text>
            <ExternalLink size={11} color={colors.primary} />
          </Pressable>
        )}
      </View>
      {children}
    </View>
  );
}

function ToolCompactRow({
  isRunning,
  icon: Icon,
  text,
  onOpen,
}: {
  isRunning: boolean;
  icon: LucideIcon;
  text: React.ReactNode;
  onOpen?: () => void;
}) {
  const colors = useTheme();
  return (
    <View className="my-1.5 px-3 py-2 rounded-xl bg-background-element border border-border/80 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2 flex-1 min-w-0 mr-2">
        {isRunning ? (
          <Loader2 size={13} color={colors.primary} />
        ) : (
          <Icon size={13} color={colors.primary} />
        )}
        <Text className="text-xs text-text flex-1 min-w-0" numberOfLines={2}>
          {text}
        </Text>
      </View>
      {onOpen && !isRunning && (
        <Pressable
          onPress={onOpen}
          className="px-2 py-1 rounded-md bg-primary/15 border border-primary/25 flex-row items-center gap-1 active:opacity-75">
          <Text className="text-[11px] font-medium text-primary">Open</Text>
          <ExternalLink size={10} color={colors.primary} />
        </Pressable>
      )}
    </View>
  );
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

  const isRunning =
    state === "call" ||
    state === "partial-call" ||
    state === "input-streaming" ||
    state === "input-available" ||
    (!result && state !== "result" && state !== "output-available" && state !== "output-error");
  const r = (result ?? {}) as Record<string, any>;

  const handleOpenNote = (noteId: string) => {
    Haptics.selectionAsync();
    router.push({ pathname: "/notes/[id]", params: { id: noteId } });
  };

  const handleOpenUrl = (url: string) => {
    if (!url.startsWith("https://") && !url.startsWith("http://")) return;
    Haptics.selectionAsync();
    Linking.openURL(url);
  };

  // 1. Note Creation / Update / Pin / Archive
  if (
    toolName === "createNote" ||
    toolName === "updateNote" ||
    toolName === "pinNote" ||
    toolName === "archiveNote"
  ) {
    const noteId: string | undefined =
      r.note?.id || r.noteId || (args.noteId as string);
    const title: string =
      r.note?.title ||
      r.title ||
      (args.title as string) ||
      (toolName === "createNote" ? "Untitled Note" : "Note");

    let label = "Note Updated";
    let icon: LucideIcon = CheckCircle2;
    if (toolName === "createNote") {
      label = "Note Created";
    } else if (toolName === "pinNote") {
      const isPinned = r.note?.isPinned ?? r.isPinned ?? args.isPinned !== false;
      label = isPinned ? "Note Pinned" : "Note Unpinned";
      icon = Pin;
    } else if (toolName === "archiveNote") {
      const isArchived =
        r.note?.isArchived ?? r.isArchived ?? args.isArchived !== false;
      label = isArchived ? "Note Archived" : "Note Restored";
      icon = Archive;
    }

    return (
      <ToolActionCard
        isRunning={isRunning}
        icon={icon}
        label={label}
        title={title}
        onAction={noteId ? () => handleOpenNote(noteId) : undefined}
      />
    );
  }

  // 2. Expandable Search Cards (searchNotes & webSearch)
  if (toolName === "searchNotes" || toolName === "webSearch") {
    const isWeb = toolName === "webSearch";
    const query = (args.query as string) || "";
    const items: {
      key: string;
      title: string;
      rightText?: string;
      onPress: () => void;
    }[] = isWeb
      ? ((r.results || []) as { title: string; url: string }[]).map(
          (hit) => ({
            key: hit.url,
            title: hit.title,
            onPress: () => handleOpenUrl(hit.url),
          }),
        )
      : (
          (r.notes || []) as {
            id: string;
            title: string;
            folderName?: string;
          }[]
        ).map((n) => ({
          key: n.id,
          title: n.title,
          rightText: n.folderName,
          onPress: () => handleOpenNote(n.id),
        }));

    const count = isWeb ? items.length : (r.count ?? items.length);
    const headerLabel = isWeb
      ? isRunning
        ? "Searching the web..."
        : `Searched the web${count > 0 ? ` · ${count}` : ""}`
      : isRunning
        ? "Searching Notes..."
        : `Found ${count} Note${count === 1 ? "" : "s"}`;
    const HeaderIcon = isWeb ? Globe : Search;
    const RowIcon = isWeb ? Globe : FileText;

    return (
      <View className="my-1.5 p-3 rounded-2xl bg-background-element border border-border/80">
        <Pressable
          onPress={() => items.length > 0 && setIsExpanded(!isExpanded)}
          className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0 mr-2">
            <View className="w-7 h-7 rounded-lg items-center justify-center">
              {isRunning && isWeb ? (
                <Loader2 size={14} color={colors.primary} />
              ) : (
                <HeaderIcon size={14} color={colors.textSecondary} />
              )}
            </View>
            <View className="flex-1 min-w-0">
              <Text className="text-[10px] font-medium uppercase tracking-wider text-text-secondary">
                {headerLabel}
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
          {items.length > 0 && (
            <View className="p-1">
              {isExpanded ? (
                <ChevronUp size={15} color={colors.textSecondary} />
              ) : (
                <ChevronDown size={15} color={colors.textSecondary} />
              )}
            </View>
          )}
        </Pressable>

        {isExpanded && items.length > 0 && (
          <View className="mt-2.5 pt-2 border-t border-border/60 gap-1.5">
            {items.map((item) => (
              <Pressable
                key={item.key}
                onPress={item.onPress}
                className="flex-row items-center justify-between p-2 rounded-xl bg-background border border-border/40 active:bg-background-selected">
                <View className="flex-row items-center gap-2 flex-1 min-w-0 mr-2">
                  <RowIcon size={13} color={colors.textSecondary} />
                  <Text
                    className="text-xs font-medium text-text flex-1 min-w-0"
                    numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
                {isWeb ? (
                  <ExternalLink size={11} color={colors.primary} />
                ) : item.rightText ? (
                  <Text className="text-[10px] text-text-secondary">
                    {item.rightText}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  // 3. Compact Status Rows (recordMemory, listFolders, listRecentNotes, getNoteDetails)
  if (toolName === "recordMemory") {
    const memory = (args.content as string) || (args.description as string) || "";
    return (
      <ToolCompactRow
        isRunning={false}
        icon={Brain}
        text={
          <>
            <Text className="text-text-secondary">Saved context: </Text>
            <Text className="text-text font-medium">{memory}</Text>
          </>
        }
      />
    );
  }

  if (toolName === "listFolders") {
    const count = r.count ?? r.folders?.length ?? 0;
    const query = (args.query as string) || "";
    return (
      <ToolCompactRow
        isRunning={isRunning}
        icon={Folder}
        text={
          isRunning
            ? "Checking workspace folders..."
            : query
              ? `Found ${count} folder${count === 1 ? "" : "s"} matching "${query}"`
              : `Loaded ${count} workspace folder${count === 1 ? "" : "s"}`
        }
      />
    );
  }

  if (toolName === "listRecentNotes") {
    const count = r.count ?? r.notes?.length ?? 0;
    const pinnedOnly = Boolean(args.pinnedOnly);
    return (
      <ToolCompactRow
        isRunning={isRunning}
        icon={FileText}
        text={
          isRunning
            ? "Reading recent workspace notes..."
            : pinnedOnly
              ? `Loaded ${count} pinned note${count === 1 ? "" : "s"}`
              : `Loaded ${count} recent note${count === 1 ? "" : "s"}`
        }
      />
    );
  }

  if (toolName === "getNoteDetails") {
    const noteId: string | undefined = r.note?.id || (args.noteId as string);
    const title: string = r.note?.title || "Note details";
    return (
      <ToolCompactRow
        isRunning={isRunning}
        icon={FileText}
        text={isRunning ? "Reading note..." : `Inspected "${title}"`}
        onOpen={noteId ? () => handleOpenNote(noteId) : undefined}
      />
    );
  }

  // 4. Organize Note & Folder Creation / Update
  if (toolName === "organizeNote") {
    const noteId: string | undefined = r.noteId || (args.noteId as string);
    const title: string | undefined = r.title || (args.title as string);
    const folderName: string | null | undefined = r.folderName;
    const isUnfiled = args.folderId === null || r.folderId === null;

    const label = isUnfiled
      ? "Folder Unassigned"
      : folderName
        ? "Organized into Folder"
        : "Note Organized";
    const description = isUnfiled
      ? title
        ? `Moved "${title}" to general workspace`
        : "Moved note to general workspace"
      : folderName
        ? title
          ? `Moved "${title}" into ${folderName}`
          : `Organized note into ${folderName}`
        : title
          ? `Organized "${title}"`
          : "Organized note";

    return (
      <ToolActionCard
        isRunning={isRunning}
        icon={Folder}
        label={label}
        title={description}
        onAction={noteId ? () => handleOpenNote(noteId) : undefined}
      />
    );
  }

  if (toolName === "createFolder" || toolName === "updateFolder") {
    const folderName: string =
      r.folder?.name ||
      r.name ||
      (args.name as string) ||
      (toolName === "createFolder" ? "New Folder" : "Folder");
    const folderColor: string =
      r.folder?.color || (args.color as string) || colors.primary;
    const label =
      toolName === "updateFolder"
        ? "Folder Updated"
        : r.alreadyExisted
          ? "Existing Folder Linked"
          : "Folder Created";

    return (
      <ToolActionCard
        isRunning={isRunning}
        icon={Folder}
        tintColor={folderColor}
        label={label}
        title={folderName}
      />
    );
  }

  // 5. Read Web Page
  if (toolName === "readWebPage") {
    const url: string = r.url || (args.url as string) || "";
    const title: string = r.title || url || "Web page";
    return (
      <ToolActionCard
        isRunning={isRunning}
        icon={Globe}
        label={isRunning ? "Reading page..." : "Read page"}
        title={title}
        onAction={url ? () => handleOpenUrl(url) : undefined}
      />
    );
  }

  // 6. Generate Image Tool Card
  if (toolName === "generateImageKeen" || toolName === "ikeen_generate_image") {
    const description: string =
      r.description || (args.description as string) || "Generating image...";
    const imageUrl: string | undefined = r.url;
    const isError = r.ok === false || !!r.error;

    return (
      <ToolActionCard
        isRunning={isRunning}
        icon={Sparkles}
        label={
          isRunning
            ? "Generating Image..."
            : isError
              ? "Generation Failed"
              : "Image Generated"
        }
        title={description}
        titleLines={2}
        actionLabel="View"
        onAction={imageUrl ? () => handleOpenUrl(imageUrl) : undefined}>
        <View className="mt-3 rounded-xl overflow-hidden aspect-video">
          {imageUrl && !isRunning ? (
            <Image
              source={{ uri: imageUrl }}
              className="w-full h-62"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full item-center justify-center">
              <ActivityIndicator size="small" color={colors.textSecondary} />
            </View>
          )}
        </View>
        {isError && (
          <Text className="mt-1.5 text-xs text-red-500">
            {r.error || "Failed to generate image"}
          </Text>
        )}
      </ToolActionCard>
    );
  }

  // 7. Attach Image Tool Card
  if (toolName === "attachImage" || toolName === "ikeen_attach_image") {
    const noteId: string | undefined = r.noteId || (args.noteId as string);
    const inputImages = Array.isArray(args.images)
      ? (args.images as { url?: string; caption?: string; name?: string }[])
      : [];
    const attachedCount: number =
      r.stats?.attached ?? r.imagesCount ?? inputImages.length;
    const firstCaption =
      inputImages[0]?.caption ||
      inputImages[0]?.name ||
      (args.caption as string) ||
      (args.name as string);
    const subtitle =
      attachedCount > 1
        ? `${attachedCount} images attached${firstCaption ? ` · ${firstCaption}` : ""}`
        : firstCaption || "Image attached to note";

    return (
      <ToolActionCard
        isRunning={isRunning}
        icon={CheckCircle2}
        label={
          isRunning
            ? "Attaching Images..."
            : attachedCount > 1
              ? `${attachedCount} Images Attached`
              : "Image Attached"
        }
        title={subtitle}
        onAction={noteId ? () => handleOpenNote(noteId) : undefined}
      />
    );
  }

  // 8. External Connect / HTTPS Link Fallback
  const connectUrl = findHttpsUrl(result) ?? findHttpsUrl(args);
  if (connectUrl) {
    const isConnectLink =
      /composio\.dev/i.test(connectUrl) || /COMPOSIO_/i.test(toolName);
    return (
      <ToolActionCard
        isRunning={isRunning}
        icon={ExternalLink}
        label={
          isRunning ? "Working…" : isConnectLink ? "Connect app" : "Open link"
        }
        title={
          isConnectLink
            ? "Open the link to authorize this app"
            : connectUrl
        }
        subtitleItalic
        onAction={() => handleOpenUrl(connectUrl)}
      />
    );
  }

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
  if (depth > 6 || value == null) return null;
  if (typeof value === "string") {
    return value.match(/https:\/\/[^\s"'<>]+/)?.[0] ?? null;
  }
  const entries = Array.isArray(value)
    ? value
    : typeof value === "object"
      ? Object.values(value as Record<string, unknown>)
      : [];
  for (const item of entries) {
    const found = findHttpsUrl(item, depth + 1);
    if (found) return found;
  }
  return null;
}
