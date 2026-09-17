import {
  Host,
  DropdownMenu,
  DropdownMenuItem,
  Text,
} from "@expo/ui/jetpack-compose";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";

import {
  Share2,
  Info,
  Pin,
  Trash2,
  Archive,
  MoreVertical,
} from "lucide-react-native";
import { RNHostView } from "@expo/ui";
import { Pressable } from "react-native";

type NotesDetailDropdownProps = {
  isPinned: boolean;
  isArchived: boolean;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  onShare: () => void;
  onShowInfo: () => void;
};

export default function NotesDetailDropdown({
  isPinned,
  isArchived,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onShare,
  onShowInfo,
}: NotesDetailDropdownProps) {
  const colors = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Host matchContents>
      <DropdownMenu
        expanded={isExpanded}
        onDismissRequest={() => setIsExpanded(false)}>
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pressable
              onPress={() => setIsExpanded(true)}
              className="rounded-full p-4">
              <MoreVertical size={20} color={colors.textSecondary} />
            </Pressable>
          </RNHostView>
        </DropdownMenu.Trigger>
        <DropdownMenu.Items>
          {/* Pin/Unpin */}
          <DropdownMenuItem
            onClick={() => {
              onTogglePin();
              setIsExpanded(false);
            }}>
            <DropdownMenuItem.LeadingIcon>
              <Pin
                size={20}
                color={isPinned ? colors.primary : colors.textSecondary}
                fill={isPinned ? colors.primary : "transparent"}
              />
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text color={colors.text}>{isPinned ? "Unpin" : "Pin"}</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
          {/* Archive/Unarchive */}
          <DropdownMenuItem
            onClick={() => {
              onToggleArchive();
              setIsExpanded(false);
            }}>
            <DropdownMenuItem.LeadingIcon>
              <Archive
                size={20}
                color={isArchived ? colors.primary : colors.textSecondary}
              />
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
              setIsExpanded(false);
            }}>
            <DropdownMenuItem.LeadingIcon>
              <Share2 size={20} color={colors.textSecondary} />
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text color={colors.text}>Share</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
          {/* Info/Details */}
          <DropdownMenuItem
            onClick={() => {
              onShowInfo();
              setIsExpanded(false);
            }}>
            <DropdownMenuItem.LeadingIcon>
              <Info size={20} color={colors.textSecondary} />
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text color={colors.text}>View Notes Info</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
          {/* Delete */}
          <DropdownMenuItem
            onClick={() => {
              onDelete();
              setIsExpanded(false);
            }}>
            <DropdownMenuItem.LeadingIcon>
              <Trash2 size={20} color="#ef4444" />
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text color="#ef4444">Delete</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
