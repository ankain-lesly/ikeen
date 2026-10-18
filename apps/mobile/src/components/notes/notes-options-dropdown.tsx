import {
  Host,
  DropdownMenu,
  DropdownMenuItem,
  Text,
  RNHostView,
} from "@expo/ui/jetpack-compose";
import { useMemo, useState, useCallback } from "react";
import { useTheme } from "@/hooks/use-theme";

import { BottomSheet } from "@expo/ui";

import {
  Share2,
  Info,
  Pin,
  Trash2,
  Archive,
  MoreVertical,
  FolderInput,
} from "lucide-react-native";
import {
  Alert,
  Pressable,
  View,
  TouchableOpacity,
  Text as RNText,
} from "react-native";
import { hardDeleteNote, restoreNote } from "@/lib/queries/notes";
import { toast } from "@/lib/toast";
import { formatDate } from "@repo/utils";
import { ThemedText } from "../ui/themed-text";

type NotesOptionsDropdownProps = {
  variant?: "sheet" | "dropdown";
  isExpanded?: boolean;
  isPinned: boolean;
  isDeleted: boolean;
  noteId: string;
  isArchived: boolean;
  iconStyle?: {
    className?: string;
    size?: number;
  };
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete?: () => void;
  onShare: () => void;
  setIsExpanded?: (a: boolean) => void;
  onShowInfo?: () => void;
  onMoveToFolder?: () => void;
  customTrigger?: React.ReactNode;
  lastEdited?: string;
};

export function NotesOptionsDropdown({
  variant = "sheet",
  isExpanded,
  setIsExpanded,
  isPinned,
  isArchived,
  isDeleted,
  noteId,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onShare,
  onShowInfo,
  onMoveToFolder,
  customTrigger,
  iconStyle = {},
  lastEdited,
}: NotesOptionsDropdownProps) {
  const colors = useTheme();
  const [isLocalExpanded, setIsLocalExpanded] = useState(false);

  const localExpanded = useMemo(
    () => (isExpanded !== undefined ? isExpanded : isLocalExpanded),
    [isExpanded, isLocalExpanded],
  );

  const handleHardDelete = (id: string) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await hardDeleteNote(id);
            toast.info("Note deleted");
          } catch {
            Alert.alert("Error", "Could not delete note");
          }
        },
      },
    ]);
  };

  const { className = "p-4", size = 20 } = iconStyle;

  if (variant === "sheet") {
    return (
      <NotesOptionsSheet
        isPinned={isPinned}
        isArchived={isArchived}
        isDeleted={isDeleted}
        noteId={noteId}
        onTogglePin={onTogglePin}
        onToggleArchive={onToggleArchive}
        onDelete={onDelete}
        onShare={onShare}
        onShowInfo={onShowInfo}
        onMoveToFolder={onMoveToFolder}
        iconStyle={iconStyle}
        customTrigger={customTrigger}
        lastEdited={lastEdited}
      />
    );
  }

  return (
    <Host matchContents>
      <DropdownMenu
        expanded={localExpanded}
        onDismissRequest={() => {
          setIsExpanded?.(false);
          setIsLocalExpanded?.(false);
        }}>
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                setIsExpanded?.(true);
                setIsLocalExpanded?.(true);
              }}
              className={`rounded-full ${className}`}>
              {customTrigger || (
                <MoreVertical size={size} color={colors.textSecondary} />
              )}
            </Pressable>
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {/* Delete */}
          {!isDeleted ? (
            <>
              {/* Pin/Unpin */}
              <DropdownMenuItem
                onClick={() => {
                  onTogglePin();
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Pin
                      size={20}
                      color={isPinned ? colors.primary : colors.textSecondary}
                      fill={isPinned ? colors.primary : "transparent"}
                    />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color={colors.text}>
                    {isPinned ? "Unpin Note" : "Pin Note"}
                  </Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
              {/* Archive/Unarchive */}
              {onToggleArchive && <DropdownMenuItem
                onClick={() => {
                  onToggleArchive();
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Archive
                      size={20}
                      color={isArchived ? colors.primary : colors.textSecondary}
                    />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color={colors.text}>
                    {isArchived ? "Unarchive" : "Archive"}
                  </Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>}
              {/* Share */}
              {onShare && <DropdownMenuItem
                onClick={() => {
                  onShare();
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Share2 size={20} color={colors.textSecondary} />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color={colors.text}>Share</Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>}
              {/* Move to Folder */}
              {onMoveToFolder && (
                <DropdownMenuItem
                  onClick={() => {
                    onMoveToFolder();
                  }}>
                  <DropdownMenuItem.LeadingIcon>
                    <RNHostView matchContents>
                      <FolderInput size={20} color={colors.textSecondary} />
                    </RNHostView>
                  </DropdownMenuItem.LeadingIcon>
                  <DropdownMenuItem.Text>
                    <Text color={colors.text}>Move to Folder</Text>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
              )}
              {/* Info/Details */}
              {onShowInfo && (
                <DropdownMenuItem
                  onClick={() => {
                    onShowInfo();
                  }}>
                  <DropdownMenuItem.LeadingIcon>
                    <RNHostView matchContents>
                      <Info size={20} color={colors.textSecondary} />
                    </RNHostView>
                  </DropdownMenuItem.LeadingIcon>
                  <DropdownMenuItem.Text>
                    <Text color={colors.text}>Info</Text>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
              )}
              {onDelete && <DropdownMenuItem
                onClick={() => {
                  onDelete();
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Trash2 size={20} color="#ef4444" />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color="#ef4444">Delete Note</Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>}
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => {
                  handleHardDelete(noteId);
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Trash2 size={20} color="#ef4444" />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color="#ef4444">Delete Note</Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  restoreNote(noteId).catch((e) =>
                    toast.error("Could not restore note"),
                  );
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Trash2 size={20} color={colors.primary} />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color={colors.primary}>Restore Note</Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}

// Sheet variant implemented
type NotesOptionsSheetProps = NotesOptionsDropdownProps;
function NotesOptionsSheet({
  isPinned,
  isArchived,
  isDeleted,
  noteId,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onShare,
  onShowInfo,
  onMoveToFolder,
  iconStyle = {},
  customTrigger,
  lastEdited,
}: NotesOptionsSheetProps) {
  const colors = useTheme();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { className = "p-4", size = 20 } = iconStyle;

  const handleHardDelete = useCallback((id: string) => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await hardDeleteNote(id);
            toast.info("Note deleted");
            setIsSheetOpen(false);
          } catch {
            Alert.alert("Error", "Could not delete note");
          }
        },
      },
    ]);
  }, []);

  const handleRestore = useCallback((id: string) => {
    restoreNote(id)
      .then(() => toast.success("Note restored"))
      .catch(() => toast.error("Could not restore note"));
    setIsSheetOpen(false);
  }, []);

  const handleDelete = useCallback(() => {
    onDelete?.();
    setIsSheetOpen(false);
  }, [onDelete]);

  const handlePin = useCallback(() => {
    onTogglePin();
    setIsSheetOpen(false);
  }, [onTogglePin]);

  const handleArchive = useCallback(() => {
    onToggleArchive();
    setIsSheetOpen(false);
  }, [onToggleArchive]);

  const handleShare = useCallback(() => {
    onShare();
    setIsSheetOpen(false);
  }, [onShare]);

  const handleInfo = useCallback(() => {
    onShowInfo?.();
    setIsSheetOpen(false);
  }, [onShowInfo]);

  const handleMoveToFolder = useCallback(() => {
    onMoveToFolder?.();
    setIsSheetOpen(false);
  }, [onMoveToFolder]);

  return (
    <>
      {/* Trigger */}
      <Pressable
        onPress={() => setIsSheetOpen(true)}
        className={`rounded-full ${className}`}
        style={{ alignSelf: "flex-start" }}>
        {customTrigger || (
          <MoreVertical size={size} color={colors.textSecondary} />
        )}
      </Pressable>

      {/* Sheet */}
      <BottomSheet
        isPresented={isSheetOpen}
        onDismiss={() => setIsSheetOpen(false)}
        showDragIndicator
        // snapPoints={["40%", "60%", "90%"]}
        containerColor={colors.card}>
        <RNHostView matchContents>
          <View className="flex-1 pt-2 w-full p-4">
            {/* Header: Title + Close Button */}
            <View className="flex-row items-center justify-between mb-4">
              <ThemedText type="default">
                {lastEdited ? `Edited ${formatDate(lastEdited)}` : "Options"}
              </ThemedText>
              {/* <TouchableOpacity testID="close-sheet" onPress={() => setIsSheetOpen(false)} hitSlop={8}>
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity> */}
            </View>

            {/* Option Actions */}
            <View className="gap-1">
              {!isDeleted ? (
                <>
                  <SheetButton
                    icon={
                      <Pin
                        size={20}
                        color={isPinned ? colors.primary : colors.textSecondary}
                        fill={isPinned ? colors.primary : "transparent"}
                      />
                    }
                    label={isPinned ? "Unpin Note" : "Pin Note"}
                    onPress={handlePin}
                    color={colors.text}
                  />
                  <SheetButton
                    icon={
                      <Archive
                        size={20}
                        color={
                          isArchived ? colors.primary : colors.textSecondary
                        }
                      />
                    }
                    label={isArchived ? "Unarchive" : "Archive"}
                    onPress={handleArchive}
                    color={colors.text}
                  />
                  {handleShare && <SheetButton
                    icon={<Share2 size={20} color={colors.textSecondary} />}
                    label="Share"
                    onPress={handleShare}
                    color={colors.text}
                  />}
                  {onMoveToFolder && (
                    <SheetButton
                      icon={
                        <FolderInput size={20} color={colors.textSecondary} />
                      }
                      label="Move to Folder"
                      onPress={handleMoveToFolder}
                      color={colors.text}
                    />
                  )}
                  {onShowInfo && (
                    <SheetButton
                      icon={<Info size={20} color={colors.textSecondary} />}
                      label="Info"
                      onPress={handleInfo}
                      color={colors.text}
                    />
                  )}
                  {onDelete && <SheetButton
                    icon={<Trash2 size={20} color="#ef4444" />}
                    label="Delete Note"
                    onPress={handleDelete}
                    color="#ef4444"
                  />}
                </>
              ) : (
                <>
                  <SheetButton
                    icon={<Trash2 size={20} color="#ef4444" />}
                    label="Delete Note"
                    onPress={() => handleHardDelete(noteId)}
                    color="#ef4444"
                  />
                  <SheetButton
                    icon={<Trash2 size={20} color={colors.primary} />}
                    label="Restore Note"
                    onPress={() => handleRestore(noteId)}
                    color={colors.primary}
                  />
                </>
              )}
            </View>
          </View>
        </RNHostView>
      </BottomSheet>
    </>
  );
}

// Helper sheet action button
function SheetButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center p-3 rounded-lg"
      style={{ gap: 12 }}
      onPress={onPress}
      activeOpacity={0.7}>
      {icon}
      <RNText style={{ color: color ?? undefined, fontSize: 14 }}>
        {label}
      </RNText>
    </TouchableOpacity>
  );
}
