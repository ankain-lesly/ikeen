import React, { useState } from "react";
import { Pressable, View } from "react-native";
import * as Haptics from "expo-haptics";
import { FileText, FolderPlus, Plus, X } from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";
import { usePathname } from "expo-router";
import { BottomTabInset } from "@/constants/theme";

export interface SpeedDialFABProps {
  onNewFolder: () => void;
  onNewNote: () => void;
  className?: string;
}

/**
 * Speed-Dial FAB matching the Catat reference UI:
 * - Circular primary action button (+)
 * - Vertical speed-dial bubble stack for 'New Folder' and 'New Note'
 */
export function SpeedDialFAB({
  onNewFolder,
  onNewNote,
  className = "",
}: SpeedDialFABProps) {
  const colors = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const pathname = usePathname();

  // Determine which action is "active"
  const isFolderActive = pathname === "/notes/folders";
  const isNoteActive = pathname === "/notes";

  const toggleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen((prev) => !prev);
  };

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(false);
    action();
  };

  return (
    <View className={`items-center ${className}`}>
      {/* Backdrop to dismiss when open */}
      {isOpen && (
        <Pressable
          onPress={() => setIsOpen(false)}
          className="absolute -top-250 -left-250 -right-250 -bottom-250 z-10"
        />
      )}

      {/* Speed Dial Menu Stack */}
      <View
        style={{
          bottom: BottomTabInset,
        }}
        className="absolute right-4">
        {isOpen && (
          <View className="mb-3.5 z-20 items-center gap-2.5 rounded-full bg-card border border-primary/30 py-2 px-1.5 shadow-xl">
            {/* New Folder Action */}
            <Pressable
              onPress={() => handleAction(onNewFolder)}
              hitSlop={6}
              className={`w-11 h-11 rounded-full items-center justify-center active:bg-primary/20 active:scale-95${isFolderActive ? " border border-primary/20 bg-primary/20" : ""}`}>
              <FolderPlus
                size={20}
                color={isFolderActive ? colors.primary : colors.text}
              />
            </Pressable>

            {/* New Note Action */}
            <Pressable
              onPress={() => handleAction(onNewNote)}
              hitSlop={6}
              className={`w-11 h-11 rounded-full items-center justify-center active:bg-primary/20 active:scale-95${isNoteActive ? " border border-primary/20 bg-primary/20" : ""}`}>
              <FileText
                size={20}
                color={isNoteActive ? colors.primary : colors.text}
              />
            </Pressable>
          </View>
        )}

        {/* Main Floating Trigger Button */}
        <Pressable
          onPress={toggleOpen}
          className="w-14 h-14 rounded-full bg-primary items-center justify-center shadow-lg active:scale-95 z-20"
          style={{
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            elevation: 6,
          }}>
          {isOpen ? (
            <X size={26} color="#ffffff" strokeWidth={2.4} />
          ) : (
            <Plus size={28} color="#ffffff" strokeWidth={2.4} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
