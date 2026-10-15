import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "@/lib/haptics";
import { Check, Lock, X } from "lucide-react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { useTheme } from "@/hooks/use-theme";
import type { CreateFolderInput, FolderWithCount } from "@/lib/types/folders";
import {
  FOLDER_PRESET_COLORS,
  DEFAULT_FOLDER_COLOR,
} from "@repo/utils/constants";
import { Host, Switch, RNHostView } from "@expo/ui/jetpack-compose";
import { BottomSheet } from "@expo/ui";
import { FolderGlyph } from "./folder-glyph";
import { KeyboardGradualWrapper } from "../keyboard-gradual-animation";
import { createFolder } from "@/lib/queries/folders";
import { toast } from "@/lib/toast";

export interface CreateFolderSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  folderToEdit?: FolderWithCount | null;
}

/**
 * @deprecated use the screen instead
 */
export function CreateFolderSheet({
  isPresented,
  onDismiss,
  folderToEdit,
}: CreateFolderSheetProps) {
  const colors = useTheme();

  return (
    <Host matchContents>
      {isPresented && (
        <BottomSheet
          isPresented={isPresented}
          onDismiss={onDismiss}
          snapPoints={["half", "full"]}
          showDragIndicator={true}
          containerColor={colors.card}>
          <RNHostView>
            <View className="flex-1 bg-card pt-3 pb-safe">
              <CreateFolderBody
                onDismiss={onDismiss}
                folderToEdit={folderToEdit}
              />
            </View>
          </RNHostView>
        </BottomSheet>
      )}
    </Host>
  );
}

export interface CreateFolderBodyProps {
  // isPresented: boolean;
  onDismiss: () => void;
  folderToEdit?: FolderWithCount | null;
  // onSave: (data: CreateFolderInput) => Promise<void>;
}

export const CreateFolderBody = ({
  folderToEdit,
  onDismiss,
}: CreateFolderBodyProps) => {
  const colors = useTheme();

  // 1. Set values immediately during initialization pass
  const [name, setName] = useState(folderToEdit?.name ?? "");
  const [selectedColor, setSelectedColor] = useState(
    folderToEdit?.color ?? DEFAULT_FOLDER_COLOR,
  );
  const [isLocked, setIsLocked] = useState(folderToEdit?.isLocked ?? false);
  const [pinCode, setPinCode] = useState(folderToEdit?.pinCode ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Save
  const onSave = async (data: CreateFolderInput) => {
    try {
      await createFolder(data);
      toast.success("New Folder Added");
    } catch (error) {
      toast.error("Could not add folder");
      console.log(error);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Validation Error", "Please enter a folder name");
      return;
    }

    if (isLocked && !pinCode.trim()) {
      Alert.alert(
        "Validation Error",
        "Please specify a PIN code for locked folders",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await onSave({
        name: trimmedName,
        color: selectedColor,
        isLocked,
        pinCode: isLocked ? pinCode.trim() : null,
      });

      onDismiss();
    } catch (error) {
      console.log("Error: ", error);
      Alert.alert("Error", "Failed to save folder");
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <KeyboardGradualWrapper>
      <Host matchContents style={{ flex: 1 }}>
        <View className="flex-1">
          {/* Header */}
          {/* <View className="flex-row items-center justify-between pb-4 border-b border-border">
            <ThemedText className="text-lg font-bold text-text">
              {folderToEdit ? "Edit Folder" : "New Folder"}
            </ThemedText>

            <Pressable
              onPress={onDismiss}
              hitSlop={8}
              className="w-8 h-8 rounded-full items-center justify-center bg-background-element active:opacity-70">
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View> */}

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1 pt-4 px-5"
            keyboardShouldPersistTaps="handled">
            {/* Live Folder Preview */}
            <View className="items-center justify-center py-4 mb-2">
              <FolderGlyph
                color={selectedColor}
                isLocked={isLocked}
                size="lg"
              />
            </View>

            {/* Folder Name Input */}
            <View className="mb-5">
              <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2">
                Folder Name
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter folder name..."
                placeholderTextColor={colors.textSecondary}
                autoFocus={!folderToEdit}
                className="h-12 px-4 rounded-xl border border-border bg-background-element text-text text-base"
              />
            </View>

            {/* Color Palette */}
            <View className="mb-5">
              <Text className="text-xs font-semibold uppercase tracking-wider text-text-secondary mb-2.5">
                Folder Color
              </Text>
              <View className="flex-row flex-wrap justify-between gap-3">
                {FOLDER_PRESET_COLORS.map((c) => {
                  const isSelected = selectedColor === c;
                  return (
                    <Pressable
                      key={c}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedColor(c);
                      }}
                      className="w-10 h-10 rounded-full items-center justify-center active:scale-95"
                      style={{
                        backgroundColor: c,
                        borderWidth: isSelected ? 3 : 0,
                        borderColor: colors.card,
                      }}>
                      {isSelected && (
                        <Check size={18} color="#ffffff" strokeWidth={3} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Lock & PIN Settings */}
            <View className="mb-6 p-4 rounded-2xl border_border-border_bg-background-element">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-8 h-8 rounded-full items-center justify-center">
                    <Lock size={20} color="#ef4444" />
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-text">
                      Protect with PIN
                    </Text>
                    <Text className="text-xs text-text-secondary">
                      Require passcode to access notes
                    </Text>
                  </View>
                </View>

                <Host matchContents>
                  <Switch
                    value={isLocked}
                    onCheckedChange={(val) => {
                      Haptics.selectionAsync();
                      setIsLocked(val);
                    }}
                  />
                </Host>
              </View>

              {isLocked && (
                <View className="mt-3 pt-3 border-t border-border">
                  <Text className="text-xs font-medium text-text-secondary mb-1.5">
                    Set 4-Digit Passcode
                  </Text>
                  <TextInput
                    value={pinCode}
                    onChangeText={setPinCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="e.g. 1234"
                    secureTextEntry
                    placeholderTextColor={colors.textSecondary}
                    className="h-10 px-3 rounded-lg border border-border bg-card text-text font-mono text-center tracking-widest text-lg"
                  />
                </View>
              )}
            </View>
          </ScrollView>
          <View className="py-2 px-4">
            {/* Save Action Button */}
            <Pressable
              onPress={handleSave}
              disabled={isSubmitting || !name.trim()}
              className={`h-12 rounded-xl items-center justify-center bg-primary active:opacity-90 ${
                !name.trim() ? "opacity-50" : "opacity-100"
              }`}>
              <Text className="text-white font-semibold text-base">
                {folderToEdit ? "Save Changes" : "Create Folder"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Host>
    </KeyboardGradualWrapper>
  );
};
