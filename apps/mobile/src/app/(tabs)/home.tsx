import { ThemedView } from "@/components/ui/themed-view";
import { ThemedText } from "@/components/ui/themed-text";
import { Redirect } from "expo-router";

export default function Home() {
  // return <Redirect href="/notes/your-first-task-list-note" />;

  return (
    <ThemedView className="flex-1 items-center justify-center">
      <ThemedText type="title">Home</ThemedText>
    </ThemedView>
  );
}