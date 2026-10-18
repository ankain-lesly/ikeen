import { RNHostView } from "@expo/ui/jetpack-compose";
import { useTheme } from "@/hooks/use-theme";

import { BottomSheet } from "@expo/ui";

import { Copy, ExternalLink } from "lucide-react-native";
import { View, TouchableOpacity, Text as RNText, Linking } from "react-native";
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

  return (
    <>
      {/* Sheet */}
      <BottomSheet
        isPresented={isSheetOpen}
        onDismiss={() => onDismiss()}
        showDragIndicator
        snapPoints={["half"]}
        containerColor={colors.card}>
        <RNHostView matchContents>
          <View className="flex-1_ pt-2 w-full p-4">
            {/* Header: Title + Close Button */}
            <View className="flex-row items-center justify-between mb-4">
              <ThemedText
                type="default"
                className="text-sm text-text-secondary">
                {url}
              </ThemedText>
            </View>

            {/* Option Actions */}
            <View className="gap-1">
              <SheetButton
                icon={<Copy size={20} color={colors.text} />}
                label="Copy Link"
                onPress={() => {
                  copyToClipboard(url)
                  onDismiss()
                }}
                color={colors.text}
              />
              <SheetButton
                icon={<ExternalLink size={20} color={colors.text} />}
                label="Open Link"
                onPress={() => {
                  openLink(url ?? "")
                  onDismiss()
                }}
                color={colors.text}
              />
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
