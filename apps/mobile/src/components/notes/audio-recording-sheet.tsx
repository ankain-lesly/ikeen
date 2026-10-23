import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Mic, Square, Check, X } from "lucide-react-native";
import { useAudioRecorder, RecordingPresets } from "expo-audio";
import * as Crypto from "expo-crypto";
import { useTheme } from "@/hooks/use-theme";
import * as Haptics from "@/lib/haptics";
import type { MediaItem } from "@/lib/types/notes";
import { ensureAudioRecordingPermission } from "@/lib/media/permissions";
import { saveAssetToSandbox } from "@/lib/media/file-system";
import { formatDuration } from "@/lib/media/use-audio-player";
import { OptionSheet } from "@/components/ui/option-sheet";

export interface AudioRecordingSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onFinished: (item: MediaItem) => void;
}

export function AudioRecordingSheet({
  visible,
  onDismiss,
  onFinished,
}: AudioRecordingSheetProps) {
  const colors = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
      setSeconds(0);
    }
  }, [visible]);

  const startRecording = async () => {
    const hasPerm = await ensureAudioRecordingPermission();
    if (!hasPerm) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setSeconds(0);

      timerRef.current = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn("[AudioRecordingSheet] Failed to start recording:", err);
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } catch {
      // Ignored
    }
    setIsRecording(false);
    setSeconds(0);
    onDismiss();
  };

  const finishRecording = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await recorder.stop();
      const recordingUri = recorder.uri;

      if (recordingUri) {
        const saved = await saveAssetToSandbox(
          recordingUri,
          "audio",
          `recording_${Date.now()}.m4a`,
        );

        const item: MediaItem = {
          id: Crypto.randomUUID(),
          mediaType: "audio",
          localUri: saved.localUri,
          name: saved.name,
          metadata: {
            duration: seconds,
          },
          synced: false,
        };

        onFinished(item);
      }
    } catch (err) {
      console.warn("[AudioRecordingSheet] Failed to stop/save recording:", err);
    } finally {
      setIsRecording(false);
      setSeconds(0);
      onDismiss();
    }
  };

  return (
    <OptionSheet
      isPresented={visible}
      onDismiss={cancelRecording}
      snapPoints={["half"]}
      title="Record Audio Note"
    >
      <View className="flex-1 items-center justify-center py-4">
        {/* Time Counter */}
        <Text
          style={{ fontVariant: ["tabular-nums"] }}
          className="text-4xl font-mono font-bold text-foreground mb-8"
        >
          {formatDuration(seconds)}
        </Text>

        {/* Main Action Controls */}
        <View className="flex-row items-center justify-center gap-8">
          {isRecording ? (
            <>
              {/* Cancel button */}
              <Pressable
                onPress={cancelRecording}
                accessibilityRole="button"
                accessibilityLabel="Cancel recording"
                className="w-12 h-12 rounded-full bg-background-element items-center justify-center border border-border"
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>

              {/* Stop / Pulse Recording button */}
              <Pressable
                onPress={finishRecording}
                accessibilityRole="button"
                accessibilityLabel="Finish and save audio recording"
                className="w-20 h-20 rounded-full bg-red-500 items-center justify-center active:opacity-80 shadow-md"
              >
                <Square size={24} color="#ffffff" fill="#ffffff" />
              </Pressable>

              {/* Done check button */}
              <Pressable
                onPress={finishRecording}
                accessibilityRole="button"
                accessibilityLabel="Done recording"
                className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center"
              >
                <Check size={20} color={colors.primary} />
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={startRecording}
              accessibilityRole="button"
              accessibilityLabel="Start recording audio"
              className="w-20 h-20 rounded-full bg-primary items-center justify-center active:opacity-80 shadow-md"
            >
              <Mic size={32} color="#ffffff" />
            </Pressable>
          )}
        </View>

        <Text className="text-xs text-text-secondary mt-6">
          {isRecording
            ? "Tap the red square or checkmark to finish"
            : "Tap the microphone to start recording"}
        </Text>
      </View>
    </OptionSheet>
  );
}
