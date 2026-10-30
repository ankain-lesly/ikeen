import { Stack } from "expo-router";

export default function NotesLayout() {
  // return <Stack screenOptions={{ headerShown: false }} />

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="create-folder"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.5, 0.75, 1.0],
          sheetGrabberVisible: true,
          headerShown: true,
          sheetCornerRadius: 20,
        }}
      />
    </Stack>
  );
}
