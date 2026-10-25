

import { BottomSheet } from "@expo/ui";
import { RNHostView } from "@expo/ui/jetpack-compose";
import { View, Text as RNText, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";

export type SheetAction = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  color?: string;
  visible?: boolean;
};

type OptionSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  title?: string | React.ReactNode;
  actions?: SheetAction[];
  children?: React.ReactNode;
  snapPoints?: ("half" | "full")[];
  showDragIndicator?: boolean;
  matchHTMLContents?: boolean;
};

export function OptionSheet({
  isPresented,
  onDismiss,
  title,
  actions = [],
  children,
  snapPoints = ["half"],
  showDragIndicator = true,
  matchHTMLContents = true,
}: OptionSheetProps) {
  const colors = useTheme();

  // Filter out actions that are not visible
  const visibleActions = actions.filter((action) => action.visible !== false);

  return (
    <>
      <BottomSheet
        isPresented={isPresented}
        onDismiss={onDismiss}
        showDragIndicator={showDragIndicator}
        snapPoints={snapPoints}
        containerColor={colors.card}>
        <RNHostView matchContents={matchHTMLContents}>
          <View className="flex-1 w-full p-4">
            {/* Header */}
            {title ? (
              <View className="flex-row items-center justify-between mb-4">
                <ThemedText type="default">{title}</ThemedText>
              </View>
            ) : null}

            {/* Actions or Children */}
            {children ? (
              <View className="flex-1">{children}</View>
            ) : (
              <View className="gap-1">
                {visibleActions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    className="flex-row items-center p-3 rounded-lg"
                    style={{ gap: 12 }}
                    onPress={action.onPress}
                    activeOpacity={0.7}>
                    {action.icon}
                    <RNText
                      style={{
                        color: action.color ?? colors.text,
                        fontSize: 14,
                      }}>
                      {action.label}
                    </RNText>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </RNHostView>
      </BottomSheet>
    </>
  );
}