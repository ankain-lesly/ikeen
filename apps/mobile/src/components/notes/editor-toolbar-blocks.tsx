import { RNHostView } from "@expo/ui/jetpack-compose";
import { useTheme } from "@/hooks/use-theme";

import { OptionSheet } from "@/components/ui/option-sheet";

import {
  Camera,
  ImageIcon,
  CheckSquare,
  Type as TextIcon,
  Mic,
} from "lucide-react-native";
import { View } from "react-native";

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

  const actions = [
    {
      label: "Take Photo",
      icon: <Camera size={20} color={colors.text} />,
      onPress: () => {
        onTakePhoto?.();
        onDismiss();
      },
      color: colors.text,
      visible: !!onTakePhoto,
    },
    {
      label: "Add Media",
      icon: <ImageIcon size={20} color={colors.text} />,
      onPress: () => {
        onAddMedia?.();
        onDismiss();
      },
      color: colors.text,
      visible: !!onAddMedia,
    },
    {
      label: "Checkbox Block",
      icon: <CheckSquare size={20} color={colors.text} />,
      onPress: () => {
        onAddCheckboxBlock?.();
        onDismiss();
      },
      color: colors.text,
      visible: !!onAddCheckboxBlock,
    },
    {
      label: "Text Block",
      icon: <TextIcon size={20} color={colors.text} />,
      onPress: () => {
        onAddTextBlock?.();
        onDismiss();
      },
      color: colors.text,
      visible: !!onAddTextBlock,
    },
    {
      label: "Record Audio",
      icon: <Mic size={20} color={colors.text} />,
      onPress: () => {
        onRecordAudio?.();
        onDismiss();
      },
      color: colors.text,
      visible: !!onRecordAudio,
    },
  ];

  return (
    <OptionSheet
      isPresented={isSheetOpen}
      onDismiss={onDismiss}
      actions={actions}
    />
  );
}
