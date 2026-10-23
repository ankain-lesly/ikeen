import { useTheme } from "@/hooks/use-theme";
import { OptionSheet } from "@/components/ui/option-sheet";
import {
  Camera,
  ImageIcon,
  CheckSquare,
  Type as TextIcon,
  Mic,
  FilePlus,
} from "lucide-react-native";

type NotesEditorToolbarBlocksProps = {
  isSheetOpen: boolean;
  onDismiss: () => void;
  onTakePhoto?: () => void;
  onAddMedia?: () => void;
  onAddCheckboxBlock?: () => void;
  onAddTextBlock?: () => void;
  onRecordAudio?: () => void;
  onAttachFile?: () => void;
};

export function NotesEditorToolbarBlocks({
  isSheetOpen,
  onDismiss,
  onTakePhoto,
  onAddMedia,
  onAddCheckboxBlock,
  onAddTextBlock,
  onRecordAudio,
  onAttachFile,
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
      label: "Add Photos",
      icon: <ImageIcon size={20} color={colors.text} />,
      onPress: () => {
        onAddMedia?.();
        onDismiss();
      },
      color: colors.text,
      visible: !!onAddMedia,
    },
    {
      label: "Attach File",
      icon: <FilePlus size={20} color={colors.text} />,
      onPress: () => {
        onAttachFile?.();
        onDismiss();
      },
      color: colors.text,
      visible: !!onAttachFile,
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
  ];

  return (
    <OptionSheet
      isPresented={isSheetOpen}
      onDismiss={onDismiss}
      actions={actions}
    />
  );
}
