import {
  Platform,
} from "react-native";

import type { FolderWithCount } from "@/lib/types/folders";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";

import Close from "@expo/material-symbols/close.xml";
import { CreateFolderBody } from "@/components/folders/create-folder-sheet";

export default function FolderFormScreen() {
  const router = useRouter();

  const { folder: folderJson } = useLocalSearchParams<{ folder: string }>();

  const folderToEdit: FolderWithCount | null = folderJson
    ? JSON.parse(folderJson)
    : null;
 
  // Dismiss
  const onDismiss = () => router.dismiss();
 
  return (
    <>
      <Stack.Screen
        // name="folder-form"
        options={{
          title: folderToEdit ? "Edit Folder" : "New Folder",
          presentation: "formSheet",
          sheetAllowedDetents: [0.5, 0.75, 1.0],
          sheetGrabberVisible: true,
          sheetInitialDetentIndex: 0,
          headerShown: true,
          sheetCornerRadius: 20,
        }}
      />

      {/* ToolBar */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          // icon={require("@/assets/images/tabIcons/home.png")}
          // ios -> sf symbols only
          // icon="square.and.arrow.up"
          // android -> material symbols only
          icon={Platform.OS === "ios" ? "xmark" : Close}
          onPress={() => router.dismiss()}
        />
      </Stack.Toolbar>

      {/* Screen Details */}
      <CreateFolderBody onDismiss={onDismiss} folderToEdit={folderToEdit} />
    </>
  );
}
