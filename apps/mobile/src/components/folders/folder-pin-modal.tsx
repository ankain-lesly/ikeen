import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from '@/lib/haptics';
import { Lock, X } from 'lucide-react-native';

import { ThemedText } from '@/components/ui/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { FolderWithCount } from '@/lib/types/folders';

export interface FolderPinModalProps {
  visible: boolean;
  folder: FolderWithCount | null;
  onClose: () => void;
  onSuccess: (folder: FolderWithCount) => void;
}

export function FolderPinModal({
  visible,
  folder,
  onClose,
  onSuccess,
}: FolderPinModalProps) {
  const colors = useTheme();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!visible || !folder) return null;

  const handleVerify = () => {
    if (folder.pinCode && pin.trim() !== folder.pinCode.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setError(false);
    setPin('');
    onClose();
    onSuccess(folder);
  };

  const handleClose = () => {
    setPin('');
    setError(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}>
      <View className="flex-1 justify-center items-center bg-black/60 px-6">
        <View className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl items-center">
          {/* Close button */}
          <Pressable
            onPress={handleClose}
            hitSlop={8}
            className="absolute top-4 right-4 w-8 h-8 rounded-full items-center justify-center bg-background-element active:opacity-70">
            <X size={16} color={colors.textSecondary} />
          </Pressable>

          {/* Icon */}
          <View
            className="w-16 h-16 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: `${folder.color}20` }}>
            <Lock size={30} color={folder.color} strokeWidth={2.4} />
          </View>

          {/* Title */}
          <ThemedText className="font-bold text-xl text-center text-text mb-1">
            {folder.name}
          </ThemedText>
          <Text className="text-xs text-text-secondary text-center mb-5">
            This folder is protected. Enter passcode to open.
          </Text>

          {/* PIN Input */}
          <TextInput
            value={pin}
            onChangeText={(val) => {
              setError(false);
              setPin(val);
            }}
            keyboardType="number-pad"
            maxLength={6}
            secureTextEntry
            autoFocus
            placeholder="••••"
            placeholderTextColor={colors.textSecondary}
            className="w-48 h-12 rounded-xl border border-border bg-background-element text-center font-mono text-2xl text-text tracking-widest mb-2"
          />

          {error && (
            <Text className="text-xs font-medium text-red-500 mb-3">
              Incorrect passcode. Try again.
            </Text>
          )}

          {/* Unlock Button */}
          <Pressable
            onPress={handleVerify}
            disabled={!pin.trim()}
            className={`w-full h-12 rounded-xl items-center justify-center bg-primary active:opacity-90 mt-2 ${
              !pin.trim() ? 'opacity-50' : 'opacity-100'
            }`}>
            <Text className="text-white font-semibold text-base">Unlock</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
