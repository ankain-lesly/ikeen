import { Tabs, useRouter } from "expo-router";
import { FileText, Home, User } from "lucide-react-native";
import { useTheme } from "@/hooks/use-theme";
import { SpeedDialFAB } from "@/components/folders/speed-dial-fab";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { CreateFolderSheet } from "@/components/folders/create-folder-sheet";
import { CreateFolderInput } from "@/lib/types/folders";
import { createFolder } from "@/lib/queries/folders";
import { toast } from "@/lib/toast";
import { createNote } from "@/lib/queries/notes";
import AppTabs from "@/components/app-tabs";


export default function TabsLayout() {
  const colors = useTheme();
  const router = useRouter();

  const [isCreateFolderSheetVisible, setIsCreateFolderSheetVisible] =
    useState(false);

  const handleNewNote = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const newNote = await createNote();
      router.push({
        pathname: "/notes/[id]",
        params: { id: newNote.id },
      });
    } catch (error) {
      toast.error("Could not create note");
      console.log(error);
    }
  };

  const handleSaveFolder = async (data: CreateFolderInput) => {
    try {
      await createFolder(data);
      toast.success("New Folder Added");
    } catch (error) {
      toast.error("Could not add folder");
      console.log(error);
    }
  };

  return (
    <>
       <AppTabs />

      {/* Speed-Dial Floating Action Button */}
      <SpeedDialFAB
        onNewNote={handleNewNote}
        onNewFolder={() => setIsCreateFolderSheetVisible(true)}
      />

      {/* Create / Edit Folder Modal Sheet */}
      <CreateFolderSheet
        isPresented={isCreateFolderSheetVisible}
        onDismiss={() => {
          setIsCreateFolderSheetVisible(false);
        }}
        onSave={handleSaveFolder}
      />
    </>
  );
}
