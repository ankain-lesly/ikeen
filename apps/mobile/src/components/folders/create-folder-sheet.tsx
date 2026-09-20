import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BottomSheet, Host, RNHostView } from '@expo/ui';
import * as Haptics from 'expo-haptics';
import { Check, Folder, Lock, X } from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { CreateFolderInput, FolderWithCount } from '@/lib/types/folders';
import { FOLDER_PRESET_COLORS, DEFAULT_FOLDER_COLOR } from '@repo/utils/constants';
import { FolderGlyph } from './folder-glyph';

export interface CreateFolderSheetProps {
  isPresented: boolean;
  onDismiss: () => void;
  folderToEdit?: FolderWithCount | null;
  onSave: (data: CreateFolderInput) => Promise<void>;
}

export function CreateFolderSheet({
  isPresented,
  onDismiss,
  folderToEdit,
  onSave,
}: CreateFolderSheetProps) {
  const colors = useTheme();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_FOLDER_COLOR);
  const [isLocked, setIsLocked] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name);
      setSelectedColor(folderToEdit.color);
      setIsLocked(folderToEdit.isLocked);
      setPinCode(folderToEdit.pinCode || '');
    } else {
      setName('');
      setSelectedColor(DEFAULT_FOLDER_COLOR);
      setIsLocked(false);
      setPinCode('');
    }
  }, [folderToEdit, isPresented]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Please enter a folder name');
      return;
    }

    if (isLocked && !pinCode.trim()) {
      Alert.alert('Validation Error', 'Please specify a PIN code for locked folders');
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
      Alert.alert('Error', 'Failed to save folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Host matchContents>
      {isPresented && (
        <BottomSheet
          isPresented={isPresented}
          onDismiss={onDismiss}
          snapPoints={['half', 'full']}
          showDragIndicator={true}
          containerColor={colors.card}>
          <RNHostView>
            <View className="flex-1 bg-card px-5 pt-3 pb-safe">
        {/* Header */}
        <View className="flex-row items-center justify-between pb-4 border-b border-border">
          <ThemedText className="text-lg font-bold text-text">
            {folderToEdit ? 'Edit Folder' : 'New Folder'}
          </ThemedText>

          <Pressable
            onPress={onDismiss}
            hitSlop={8}
            className="w-8 h-8 rounded-full items-center justify-center bg-background-element active:opacity-70">
            <X size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 pt-4"
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
              placeholder="e.g. Project ;re, Food recipes..."
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
            <View className="flex-row flex-wrap gap-3">
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
                    {isSelected && <Check size={18} color="#ffffff" strokeWidth={3} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Lock & PIN Settings */}
          <View className="mb-6 p-4 rounded-2xl border border-border bg-background-element">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full items-center justify-center bg-red-500/10">
                  <Lock size={16} color="#ef4444" />
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

              <Switch
                value={isLocked}
                onValueChange={(val) => {
                  Haptics.selectionAsync();
                  setIsLocked(val);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#ffffff"
              />
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

          {/* Save Action Button */}
          <Pressable
            onPress={handleSave}
            disabled={isSubmitting || !name.trim()}
            className={`h-12 rounded-xl items-center justify-center bg-primary active:opacity-90 mb-6 ${
              !name.trim() ? 'opacity-50' : 'opacity-100'
            }`}>
            <Text className="text-white font-semibold text-base">
              {folderToEdit ? 'Save Changes' : 'Create Folder'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </RNHostView>
  </BottomSheet>
      )}
    </Host>
  );
}
