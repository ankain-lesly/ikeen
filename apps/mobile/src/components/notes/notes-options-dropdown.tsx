import {
  Host,
  DropdownMenu,
  DropdownMenuItem,
  Text,
  RNHostView,
} from "@expo/ui/jetpack-compose";
import { useTheme } from "@/hooks/use-theme";
import { OptionSheet } from "@/components/ui/option-sheet";

import {
  Share2,
  Bell,
  Info,
  Pin,
  Trash2,
  Archive,
  MoreVertical,
  FolderInput,
} from "lucide-react-native";
import {
  Pressable,
} from "react-native";
import { formatDate } from "@repo/utils";
import { NoteUpdateStateKey, useNoteActions } from "@/hooks/use-note-actions";
import { useNoteOptionsDropdown } from "@/hooks/use-note-options-dropdown";

type NotesOptionsDropdownProps = {
  variant?: "sheet" | "dropdown";
  isExpanded?: boolean;
  setIsExpanded?: (a: boolean) => void;
  isNewDraft?: boolean;
  note: {
    id: string;
    title: string;
    content: string;
    isPinned: boolean;
    isArchived: boolean;
    deletedAt?: string | null;
  };
  iconStyle?: {
    className?: string;
    color?: string;
    size?: number;
  };
  customTrigger?: React.ReactNode;
  lastEdited?: string;
  onUpdateState?: (key: NoteUpdateStateKey, value: any) => void;
  onDeleteSuccess?: () => void;
  onRestoreSuccess?: () => void;
  onReminder?: () => void;
  onMoveToFolder?: () => void;
  onShowInfo?: () => void;
  onShareLink?: () => void;
};

export function NotesOptionsDropdown({
  variant = "dropdown",
  isExpanded,
  setIsExpanded,
  isNewDraft = false,
  note,
  customTrigger,
  iconStyle = {},
  lastEdited,
  onUpdateState,
  onDeleteSuccess,
  onRestoreSuccess,
  onReminder,
  onMoveToFolder,
  onShowInfo,
  onShareLink,
}: NotesOptionsDropdownProps) {
  const colors = useTheme();

  const actions = useNoteActions({
    noteId: note.id,
    title: note.title,
    content: note.content,
    isPinned: note.isPinned,
    isArchived: note.isArchived,
    isDeleted: !!note.deletedAt,
    isNewDraft,
    onUpdateState,
    onDeleteSuccess,
    onRestoreSuccess,
  });

  const dropdown = useNoteOptionsDropdown({ isExpanded, setIsExpanded });

  const { className = "p-4", color = colors.text, size = 20 } = iconStyle;

  if (variant === "sheet") {
    return (
      <NotesOptionsSheet
        note={note}
        actions={actions}
        iconStyle={iconStyle}
        customTrigger={customTrigger}
        lastEdited={lastEdited}
        onReminder={onReminder}
        onMoveToFolder={onMoveToFolder}
        onShowInfo={onShowInfo}
        onShareLink={onShareLink}
      />
    );
  }

  return (
    <Host matchContents>
      <DropdownMenu
        expanded={dropdown.isOpen}
        onDismissRequest={dropdown.close}>
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                dropdown.toggle();
              }}
              className={`rounded-full ${className}`}>
              {customTrigger || (
                <MoreVertical size={size} color={color} />
              )}
            </Pressable>
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {!note.deletedAt ? (
            <>
              <DropdownMenuItem
                onClick={() => {
                  dropdown.close();
                  actions.handleTogglePin();
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Pin
                      size={20}
                      color={
                        note.isPinned ? colors.primary : colors.textSecondary
                      }
                      fill={note.isPinned ? colors.primary : "transparent"}
                    />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color={colors.text}>
                    {note.isPinned ? "Unpin Note" : "Pin Note"}
                  </Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => {
                  dropdown.close();
                  actions.handleToggleArchive();
                }}>
                <DropdownMenuItem.LeadingIcon>
                  <RNHostView matchContents>
                    <Archive
                      size={20}
                      color={
                        note.isArchived ? colors.primary : colors.textSecondary
                      }
                    />
                  </RNHostView>
                </DropdownMenuItem.LeadingIcon>
                <DropdownMenuItem.Text>
                  <Text color={colors.text}>
                    {note.isArchived ? "Unarchive" : "Archive"}
                  </Text>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>

              {onReminder && (
                <DropdownMenuItem
                  onClick={() => {
                    dropdown.close();
                    onReminder();
                  }}>
                  <DropdownMenuItem.LeadingIcon>
                    <RNHostView matchContents>
                      <Bell size={20} color={colors.textSecondary} />
                    </RNHostView>
                  </DropdownMenuItem.LeadingIcon>
                  <DropdownMenuItem.Text>
                    <Text color={colors.text}>Remind Me</Text>
                  </DropdownMenuItem.Text>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  dropdown.close();
                  if (onShareLink) {
                    onShareLink();
                  } else {
                    actions.handleShareNote();
                  }
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

              {onMoveToFolder && (
                <DropdownMenuItem
                  onClick={() => {
                    dropdown.close();
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

              {onShowInfo && (
                <DropdownMenuItem
                  onClick={() => {
                    dropdown.close();
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

              <DropdownMenuItem
                onClick={() => {
                  dropdown.close();
                  actions.handleDeleteNote();
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
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() => {
                  dropdown.close();
                  actions.handleHardDelete();
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
                  dropdown.close();
                  actions.handleRestoreNote();
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

function NotesOptionsSheet({
  note,
  actions,
  iconStyle,
  customTrigger,
  lastEdited,
  onReminder,
  onMoveToFolder,
  onShowInfo,
  onShareLink,
}: {
  note: NotesOptionsDropdownProps["note"];
  actions: ReturnType<typeof useNoteActions>;
  iconStyle: NotesOptionsDropdownProps["iconStyle"];
  customTrigger: NotesOptionsDropdownProps["customTrigger"];
  lastEdited?: string;
  onReminder?: () => void;
  onMoveToFolder?: () => void;
  onShowInfo?: () => void;
  onShareLink?: () => void;
}) {
  const colors = useTheme();
  const sheet = useNoteOptionsDropdown();
  const { className = "p-4", size = 20 } = iconStyle || {};

  const isDeleted = !!note.deletedAt;
  const sheetActions = [
    {
      label: note.isPinned ? "Unpin Note" : "Pin Note",
      icon: (
        <Pin
          size={20}
          color={note.isPinned ? colors.primary : colors.textSecondary}
          fill={note.isPinned ? colors.primary : "transparent"}
        />
      ),
      onPress: () => {
        sheet.close();
        actions.handleTogglePin();
      },
      color: colors.text,
      visible: !isDeleted,
    },
    {
      label: note.isArchived ? "Unarchive" : "Archive",
      icon: (
        <Archive
          size={20}
          color={note.isArchived ? colors.primary : colors.textSecondary}
        />
      ),
      onPress: () => {
        sheet.close();
        actions.handleToggleArchive();
      },
      color: colors.text,
      visible: !isDeleted,
    },
    {
      label: "Remind Me",
      icon: <Bell size={20} color={colors.textSecondary} />,
      onPress: () => {
        sheet.close();
        onReminder?.();
      },
      color: colors.text,
      visible: !isDeleted && !!onReminder,
    },
    {
      label: "Share",
      icon: <Share2 size={20} color={colors.textSecondary} />,
      onPress: () => {
        sheet.close();
        if (onShareLink) {
          onShareLink();
        } else {
          actions.handleShareNote();
        }
      },
      color: colors.text,
      visible: !isDeleted,
    },
    {
      label: "Move to Folder",
      icon: <FolderInput size={20} color={colors.textSecondary} />,
      onPress: () => {
        sheet.close();
        onMoveToFolder?.();
      },
      color: colors.text,
      visible: !isDeleted && !!onMoveToFolder,
    },
    {
      label: "Info",
      icon: <Info size={20} color={colors.textSecondary} />,
      onPress: () => {
        sheet.close();
        onShowInfo?.();
      },
      color: colors.text,
      visible: !isDeleted && !!onShowInfo,
    },
    {
      label: "Delete Note",
      icon: <Trash2 size={20} color="#ef4444" />,
      onPress: () => {
        sheet.close();
        actions.handleDeleteNote();
      },
      color: "#ef4444",
      visible: !isDeleted,
    },
    {
      label: "Delete Note",
      icon: <Trash2 size={20} color="#ef4444" />,
      onPress: () => {
        sheet.close();
        actions.handleHardDelete();
      },
      color: "#ef4444",
      visible: isDeleted,
    },
    {
      label: "Restore Note",
      icon: <Trash2 size={20} color={colors.primary} />,
      onPress: () => {
        sheet.close();
        actions.handleRestoreNote();
      },
      color: colors.primary,
      visible: isDeleted,
    },
  ];

  return (
    <>
      <Pressable
        onPress={sheet.open}
        className={`rounded-full ${className}`}
        style={{ alignSelf: "flex-start" }}>
        {customTrigger || (
          <MoreVertical size={size} color={colors.textSecondary} />
        )}
      </Pressable>

      <OptionSheet
        isPresented={sheet.isOpen}
        onDismiss={sheet.close}
        title={lastEdited ? `Edited ${formatDate(lastEdited)}` : "Options"}
        actions={sheetActions}
      />
    </>
  );
}
