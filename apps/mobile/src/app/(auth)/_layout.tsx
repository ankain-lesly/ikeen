import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="login"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.5, 0.75, 1.0],
          sheetGrabberVisible: true,
          headerShown: false,
          sheetCornerRadius: 20,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.5, 0.75, 1.0],
          sheetGrabberVisible: true,
          headerShown: false,
          sheetCornerRadius: 20,
        }}
      />
    </Stack>
  );
}
