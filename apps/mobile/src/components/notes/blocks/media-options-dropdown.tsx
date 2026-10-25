import React, { useCallback, useMemo, useState } from "react";
import {
  Host,
  DropdownMenu,
  DropdownMenuItem,
  Text,
  RNHostView,
} from "@expo/ui/jetpack-compose";
import { Pressable } from "react-native";
import {
  Edit3,
  Info,
  MoreVertical,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { MediaItem } from "@/lib/types/notes";
import { OptionSheet, type SheetAction } from "@/components/ui/option-sheet";
import { retrySingleMediaUpload } from "@/lib/media/upload-service";
import { toast } from "@/lib/toast";

export interface MediaOptionsDropdownProps {
  variant?: "sheet" | "dropdown";
  item: MediaItem | null; 
  isExpanded?: boolean;
  setIsExpanded?: (open: boolean) => void;
  visible?: boolean;
  onDismiss?: () => void;
  customTrigger?: React.ReactNode;
  iconStyle?: {
    size?: number;
    className?: string;
    color?: string;
  };
  onEditCaption?: (item: MediaItem) => void;
  onShowInfo?: (item: MediaItem) => void;
  onShare?: (item: MediaItem) => void;
  onRemove: (id: string) => void;
}

export const MediaOptionsDropdown = React.memo(function MediaOptionsDropdown({
  variant = "dropdown",
  item,
  // isExpanded,
  setIsExpanded,
  // visible,
  onDismiss,
  customTrigger,
  iconStyle = {},
  onEditCaption,
  onShowInfo,
  onShare,
  onRemove,
}: MediaOptionsDropdownProps) {
  const colors = useTheme();
  const [isLocalExpanded, setIsLocalExpanded] = useState(false);

  const isOpen = useMemo(() => {
    // if (visible !== undefined) return visible;
    // if (isExpanded !== undefined) return isExpanded;
    return isLocalExpanded;
  }, [isLocalExpanded]);

  const toggle = useCallback(() => {
    const next = !isOpen;
    // if (visible !== undefined && onDismiss && !next) {
    //   onDismiss();
    // }
    if (setIsExpanded) {
      setIsExpanded(next);
    } else {
      setIsLocalExpanded(next);
    }
  }, [isOpen, setIsExpanded]);

  const close = useCallback(() => {
    if (onDismiss) onDismiss();
    if (setIsExpanded) setIsExpanded(false);
    setIsLocalExpanded(false);
  }, [onDismiss, setIsExpanded]);

  const {
    className = "px-1 py-2 items-center justify-center rounded-full bg-black/60",
    size = 18,
    color = "#ffffff",
  } = iconStyle;

  const handleShare = useCallback(() => {
    if (!item) return;
    if (onShare) {
      onShare(item);
    } else {
      // TODO: FFix on next build
      // const isAvailable = await Sharing.isAvailableAsync();
      // if (isAvailable) {
      //   await Sharing.shareAsync(uri, {
      //     dialogTitle: item.name || "Share media",
      //   });
      // } else {
      //   toast.info("Sharing not available on this device");
      // }
      toast.info("Sharing file...");
    }
  }, [item, onShare]);

  const handleRetryUpload = useCallback(() => {
    if (!item) return;
    Haptics.selectionAsync();
    void retrySingleMediaUpload(item.id);
  }, [item]);

  const handleRemove = useCallback(() => {
    if (!item) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onRemove?.(item.id);
  }, [item, onRemove]);

  if (!item) return null;

  // Variant = "sheet"
  if (variant === "sheet") {
    const sheetActions: SheetAction[] = [
      {
        label: item.caption ? "Edit Caption" : "Add Caption",
        icon: <Edit3 size={18} color={colors.text} />,
        visible: !!onEditCaption,
        onPress: () => {
          close();
          onEditCaption?.(item);
        },
      },
      {
        label: "File Info",
        icon: <Info size={18} color={colors.text} />,
        visible: !!onShowInfo,
        onPress: () => {
          close();
          onShowInfo?.(item);
        },
      },
      {
        label: "Share",
        icon: <Share2 size={18} color={colors.text} />,
        onPress: () => {
          close();
          handleShare();
        },
      },
      {
        label: "Retry Upload",
        icon: <RefreshCw size={18} color={colors.primary} />,
        color: colors.primary,
        visible: !item.url,
        onPress: () => {
          close();
          handleRetryUpload();
        },
      },
      {
        label: "Delete",
        icon: <Trash2 size={18} color="#ef4444" />,
        color: "#ef4444",
        visible: !!onRemove,
        onPress: () => {
          close();
          handleRemove();
        },
      },
    ];

    return (
      <>
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            Haptics.selectionAsync();
            toggle();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Media options"
          className={className}>
          {customTrigger || <MoreVertical size={size} color={color} />}
        </Pressable>

        <OptionSheet
          isPresented={isOpen}
          onDismiss={close}
          title={item.name || "Media Options"}
          actions={sheetActions}
        />
      </>
    );
  }

  // Variant = "dropdown" (Native @expo/ui Jetpack Compose DropdownMenu)
  return (
    <Host matchContents>
      <DropdownMenu expanded={isOpen} onDismissRequest={close}>
        <DropdownMenu.Trigger>
          <RNHostView matchContents>
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                Haptics.selectionAsync();
                toggle();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Media options"
              className={className}>
              {customTrigger || <MoreVertical size={size} color={color} />}
            </Pressable>
          </RNHostView>
        </DropdownMenu.Trigger>

        <DropdownMenu.Items>
          {onEditCaption && (
            <DropdownMenuItem
              onClick={() => {
                close();
                onEditCaption?.(item);
              }}>
              <DropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <Edit3 size={18} color={colors.text} />
                </RNHostView>
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text color={colors.text}>
                  {item.caption ? "Edit Caption" : "Add Caption"}
                </Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          )}

          {!!onShowInfo && (
            <DropdownMenuItem
              onClick={() => {
                close();
                onShowInfo(item);
              }}>
              <DropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <Info size={18} color={colors.text} />
                </RNHostView>
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text color={colors.text}>File Info</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => {
              close();
              handleShare();
            }}>
            <DropdownMenuItem.LeadingIcon>
              <RNHostView matchContents>
                <Share2 size={18} color={colors.text} />
              </RNHostView>
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text color={colors.text}>Share</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>

          {!item.url && (
            <DropdownMenuItem
              onClick={() => {
                close();
                handleRetryUpload();
              }}>
              <DropdownMenuItem.LeadingIcon>
                <RNHostView matchContents>
                  <RefreshCw size={18} color={colors.primary} />
                </RNHostView>
              </DropdownMenuItem.LeadingIcon>
              <DropdownMenuItem.Text>
                <Text color={colors.primary}>Retry Upload</Text>
              </DropdownMenuItem.Text>
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={() => {
              close();
              handleRemove();
            }}>
            <DropdownMenuItem.LeadingIcon>
              <RNHostView matchContents>
                <Trash2 size={18} color="#ef4444" />
              </RNHostView>
            </DropdownMenuItem.LeadingIcon>
            <DropdownMenuItem.Text>
              <Text color="#ef4444">Delete</Text>
            </DropdownMenuItem.Text>
          </DropdownMenuItem>
        </DropdownMenu.Items>
      </DropdownMenu>
    </Host>
  );
});
