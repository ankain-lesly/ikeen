import { RNHostView } from "@expo/ui/jetpack-compose";
import { useTheme } from "@/hooks/use-theme";

import { BottomSheet } from "@expo/ui";

import {
  Camera,
  ImageIcon,
  CheckSquare,
  Type as TextIcon,
  Mic,
} from "lucide-react-native";
import { View, TouchableOpacity, Text as RNText } from "react-native";

// These can be extended with props as needed, currently placeholders
type NotesEditorToolbarBlocksProps = {
  isSheetOpen: boolean;
  onDismiss: () => void;
  // Optionally add callbacks for the new actions for better extensibility
  onTakePhoto?: () => void;
  onAddMedia?: () => void;
  onAddCheckboxBlock?: () => void;
  onAddTextBlock?: () => void;
  onRecordAudio?: () => void;
};

export function NotesEditorToolbarBlocks({
  isSheetOpen,
  onDismiss,
  onTakePhoto,
  onAddMedia,
  onAddCheckboxBlock,
  onAddTextBlock,
  onRecordAudio,
}: NotesEditorToolbarBlocksProps) {
  const colors = useTheme();

  function handleButtonAction(action?: () => void) {
    if (action) {
      action();
      onDismiss();
    }
  }

  return (
    <>
      {/* Sheet */}
      <BottomSheet
        isPresented={isSheetOpen}
        onDismiss={onDismiss}
        showDragIndicator
        containerColor={colors.card}>
        <RNHostView matchContents>
          <View className="flex-1_ w-full p-2">
            {/* Option Actions */}
            <View className="gap-1">
              {/* New Blocks */}
              {onTakePhoto && (
                <SheetButton
                  icon={<Camera size={20} color={colors.text} />}
                  label="Take Photo"
                  onPress={() => handleButtonAction(onTakePhoto)}
                  color={colors.text}
                />
              )}
              {onAddMedia && (
                <SheetButton
                  icon={<ImageIcon size={20} color={colors.text} />}
                  label="Add Media"
                  onPress={() => handleButtonAction(onAddMedia)}
                  color={colors.text}
                />
              )}
              {onAddCheckboxBlock && (
                <SheetButton
                  icon={<CheckSquare size={20} color={colors.text} />}
                  label="Checkbox Block"
                  onPress={() => handleButtonAction(onAddCheckboxBlock)}
                  color={colors.text}
                />
              )}
              {onAddTextBlock && (
                <SheetButton
                  icon={<TextIcon size={20} color={colors.text} />}
                  label="Text Block"
                  onPress={() => handleButtonAction(onAddTextBlock)}
                  color={colors.text}
                />
              )}
              {onRecordAudio && (
                <SheetButton
                  icon={<Mic size={20} color={colors.text} />}
                  label="Record Audio"
                  onPress={() => handleButtonAction(onRecordAudio)}
                  color={colors.text}
                />
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
