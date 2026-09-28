import { SpeedDialFAB } from "@/components/folders/speed-dial-fab";
import { useState } from "react";
import { CreateFolderSheet } from "@/components/folders/create-folder-sheet";
import { CreateFolderInput } from "@/lib/types/folders";
import { createFolder } from "@/lib/queries/folders";
import { toast } from "@/lib/toast";
import AppTabs from "@/components/app-tabs";

export default function TabsLayout() {
  const [isCreateFolderSheetVisible, setIsCreateFolderSheetVisible] =
    useState(false);

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
      <SpeedDialFAB onNewFolder={() => setIsCreateFolderSheetVisible(true)} />

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
