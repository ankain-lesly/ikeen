import { ThemedView } from "@/components/ui/themed-view";
import { ThemedText } from "@/components/ui/themed-text";

export default function Home() {
  return (
    <ThemedView className="flex-1 items-center justify-center">
      <ThemedText type="title">Home</ThemedText>
    </ThemedView>
  );
}