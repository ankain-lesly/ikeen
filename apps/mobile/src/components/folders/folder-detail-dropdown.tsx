import React, { useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import {
  Host,
  DropdownMenu,
  DropdownMenuItem,
  Text as JetpackText,
} from '@expo/ui/jetpack-compose';
import { RNHostView } from '@expo/ui';
import {
  Edit3,
  Lock,
  MoreVertical,
  Trash2,
  Unlock,
} from 'lucide-react-native';

import { useTheme } from '@/hooks/use-theme';
import type { FolderWithCount } from '@/lib/types/folders';

export interface FolderDetailDropdownProps {
  folder: FolderWithCount;
  onEdit: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  iconSize?: number;
  isExpanded?: boolean;
  setIsExpanded?: (open: boolean) => void;
}

export function FolderDetailDropdown({
  folder,
  onEdit,
  onToggleLock,
  onDelete,
  iconSize = 18,
  isExpanded,
  setIsExpanded,
}: FolderDetailDropdownProps) {
  const colors = useTheme();
  const [localExpanded, setLocalExpanded] = useState(false);

  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;

  const handleClose = () => {
    setIsExpanded?.(false);
    setLocalExpanded(false);
  };

  const handleOpen = () => {
    setIsExpanded?.(true);
    setLocalExpanded(true);
  };

  return (
    <Host matchContents>
      <DropdownMenu
        expanded={expanded}
        onDismissRequest={handleClose}>
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Folder actions"
              onPress={(e) => {
                e?.stopPropagation?.();
                handleOpen();
              }}
              hitSlop={8}
              className="min-h-11 min-w-11 items-center justify-center rounded-full active:opacity-60">
              <MoreVertical size={iconSize} color={colors.textSecondary} />
            </Pressable>
          </RNHostView>
        </DropdownMenu.Trigger>

        <DropdownMenu.Items>
          {/* Edit / Rename */}
          <DropdownMenuItem
            onClick={() => {
              handleClose();
              onEdit();
            }}>
            <DropdownMenuItem.LeadingIcon>
              <RNHostView matchContents>
                <Edit3 size={18} color={colors.textSecondary} />
              </RNHostView>
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <JetpackText color={colors.text}>Edit Folder</JetpackText>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>

          {/* Lock / Unlock */}
          <DropdownMenuItem
            onClick={() => {
              handleClose();
              onToggleLock();
            }}>
            <DropdownMenuItem.LeadingIcon>
              <RNHostView matchContents>
                {folder.isLocked ? (
                  <Unlock size={18} color={colors.textSecondary} />
                ) : (
                  <Lock size={18} color={colors.textSecondary} />
                )}
              </RNHostView>
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <JetpackText color={colors.text}>
                {folder.isLocked ? 'Unlock Folder' : 'Lock Folder'}
              </JetpackText>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>

          {/* Delete */}
          <DropdownMenuItem
            onClick={() => {
              handleClose();
              onDelete();
            }}>
            <DropdownMenuItem.LeadingIcon>
              <RNHostView matchContents>
                <Trash2 size={18} color="#ef4444" />
              </RNHostView>
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <JetpackText color="#ef4444">Delete Folder</JetpackText>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
}
