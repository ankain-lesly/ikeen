import { RNHostView } from "@expo/ui/jetpack-compose";
import { useTheme } from "@/hooks/use-theme";

import { OptionSheet } from "@/components/ui/option-sheet";

import { Copy, ExternalLink } from "lucide-react-native";
import { View, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { ThemedText } from "../ui/themed-text";
import { toast } from "@/lib/toast";

type NoteOpenURLSheetProps = {
  isSheetOpen: boolean;
  url: string;
  onDismiss: () => void;
};

function openLink(url: string) {
  if (!url) return;
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    toast.error("Invalid URL");
    return;
  }
  void Linking.openURL(url).catch(() => {
    toast.error("Failed to open the link.");
  });
}

async function copyToClipboard(url?: string) {
  if (!url) return;
  await Clipboard.setStringAsync(url);
  toast.success("Link copied to clipboard!");
}

export function OpenURLSheet({
  url,
  isSheetOpen,
  onDismiss,
}: NoteOpenURLSheetProps) {
  const colors = useTheme();

  const actions = [
    {
      label: "Copy Link",
      icon: <Copy size={20} color={colors.text} />,
      onPress: () => {
        copyToClipboard(url);
        onDismiss();
      },
      color: colors.text,
    },
    {
      label: "Open Link",
      icon: <ExternalLink size={20} color={colors.text} />,
      onPress: () => {
        openLink(url ?? "");
        onDismiss();
      },
      color: colors.text,
    },
  ];

  return (
    <OptionSheet
      isPresented={isSheetOpen}
      onDismiss={onDismiss}
      title={url}
      actions={actions}
      snapPoints={["half"]}
    />
  );
}
