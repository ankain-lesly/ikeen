import { Pressable, Text, View } from "react-native";
import { Plus, X } from "lucide-react-native";

import { useTheme } from "@/hooks/use-theme";
import { BottomTabInset } from "@/constants/theme";
import Animated, {
  FadeIn,
  FadeOut,
  // LinearTransition,
} from "react-native-reanimated";
import { useSpeedDialFab } from "@/hooks/use-speed-dial";
export interface SpeedDialFABProps {
  onNewFolder: () => void;
  className?: string;
}

/**
 * Speed-Dial FAB matching the Catat reference UI:
 * - Circular primary action button (+)
 * - Vertical speed-dial bubble stack for 'New Folder' and 'New Note'
 */

export function SpeedDialFAB({
  onNewFolder,
  className = "",
}: SpeedDialFABProps) {
  const colors = useTheme();
  const { isMenuOpen: isOpen, toggleMenu, options } = useSpeedDialFab();

  const toggleOpen = () => {
    // Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleMenu();
  };

  const handleAction = (action: () => void) => {
    // Haptics.selectionAsync();
    toggleMenu();
    action();
  };

  return (
    <View className={`items-center ${className}`}>
      {/* Backdrop to dismiss when open */}
      {isOpen && (
        <Pressable
          onPress={() => toggleMenu()}
          className="absolute -top-250 -left-250 -right-250 -bottom-250 z-10 bg-black/30"
        />
      )}

      {/* Speed Dial Menu Stack */}
      <View
        style={{
          bottom: BottomTabInset * 2,
        }}
        className="absolute right-4 items-end">
        {isOpen && (
          <View className="mb-3.5 z-20 items-end gap-2.5 rounded-3xl py-2 px-1.5">
            {options.map((o, i) => (
              <Animated.View
                key={i}
                entering={FadeIn.duration(200 * i)}
                exiting={FadeOut.duration(150)}>
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  onPress={() => handleAction(o.onPress)}
                  hitSlop={6}
                  className={`bg-foreground border border-border/20 px-4 py-2 min-h-11 flex-row gap-2 rounded-full items-center justify-center active:scale-95`}>
                  <Text className="text-background font-semibold text-base">
                    {o.label}
                  </Text>
                  <o.icon size={20} color={colors.primary} strokeWidth={2.2} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Main Floating Trigger Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isOpen ? "Close create actions" : "Create"}
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
