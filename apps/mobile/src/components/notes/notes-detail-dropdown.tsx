import {
  Host,
  DropdownMenu,
  DropdownMenuItem,
  Text,
} from "@expo/ui/jetpack-compose";
import { useMemo, useState } from "react";
import { useTheme } from "@/hooks/use-theme";

import {
  Share2,
  Info,
  Pin,
  Trash2,
  Archive,
  MoreVertical,
  FolderInput,
} from "lucide-react-native";
import { RNHostView } from "@expo/ui";
import { Alert, Pressable } from "react-native";
import { hardDeleteNote, restoreNote } from "@/lib/queries/notes";
import { toast } from "@/lib/toast";

type NotesDetailDropdownProps = {
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
  onDelete: () => void;
  onShare: () => void;
  setIsExpanded?: (a: boolean) => void;
  onShowInfo?: () => void;
  onMoveToFolder?: () => void;
  customTrigger?: React.ReactNode;
};

export default function NotesDetailDropdown({
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
}: NotesDetailDropdownProps) {
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
              <DropdownMenuItem
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
              </DropdownMenuItem>
              {/* Share */}
              <DropdownMenuItem
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
              </DropdownMenuItem>
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
                    <Text color={colors.text}>View Notes Info</Text>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  onDelete();
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Trash2 size={20} color="#ef4444" />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color="#ef4444">Trash Note</Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
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
                  restoreNote(noteId).catch(e=>toast.error("Could note restore note"));
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
