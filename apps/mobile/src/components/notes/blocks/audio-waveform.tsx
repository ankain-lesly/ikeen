import React, { useCallback, useMemo, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  View,
} from "react-native";
import Svg, { Rect } from "react-native-svg";
import * as Haptics from "@/lib/haptics";

export interface AudioWaveformProps {
  progress: number; // 0 to 1
  onSeek?: (ratio: number) => void;
  height?: number;
  barCount?: number;
  activeColor?: string;
  inactiveColor?: string;
  interactive?: boolean;
}

// Pre-computed rhythmic waveform heights (normalized 0.15 to 1.0)
const SEED_AMPLITUDES = [
  0.25, 0.45, 0.3, 0.65, 0.85, 0.5, 0.7, 0.95, 0.4, 0.6, 0.75, 0.9, 0.35, 0.8,
  0.55, 0.7, 0.88, 0.45, 0.6, 0.92, 0.78, 0.5, 0.85, 0.68, 0.4, 0.75, 0.9,
  0.6, 0.45, 0.82, 0.7, 0.5, 0.65, 0.4, 0.3, 0.2,
];

export const AudioWaveform = React.memo(function AudioWaveform({
  progress = 0,
  onSeek,
  height = 36,
  barCount = 36,
  activeColor = "#38bdf8",
  inactiveColor = "rgba(160, 160, 160, 0.3)",
  interactive = true,
}: AudioWaveformProps) {
  const [containerWidth, setContainerWidth] = useState(0);

  const amplitudes = useMemo(() => {
    if (barCount === SEED_AMPLITUDES.length) return SEED_AMPLITUDES;
    const res: number[] = [];
    for (let i = 0; i < barCount; i++) {
      const idx = Math.floor((i / barCount) * SEED_AMPLITUDES.length);
      res.push(SEED_AMPLITUDES[idx] || 0.4);
    }
    return res;
  }, [barCount]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  const handleTouch = useCallback(
    (e: GestureResponderEvent) => {
      if (!interactive || !onSeek || containerWidth <= 0) return;
      const x = e.nativeEvent.locationX;
      const ratio = Math.min(1, Math.max(0, x / containerWidth));
      Haptics.selectionAsync();
      onSeek(ratio);
    },
    [containerWidth, interactive, onSeek],
  );

  const barWidth = containerWidth > 0 ? (containerWidth / barCount) * 0.65 : 2;
  const barSpacing = containerWidth > 0 ? containerWidth / barCount : 4;
  const activeIndex = Math.floor(
    Math.min(1, Math.max(0, progress)) * barCount,
  );

  return (
    <Pressable
      onLayout={handleLayout}
      onPress={handleTouch}
      disabled={!interactive}
      accessibilityRole="adjustable"
      accessibilityLabel={`Audio waveform progress ${Math.round(progress * 100)} percent`}
      className="w-full justify-center"
      style={{ height }}
      hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
    >
      {containerWidth > 0 && (
        <Svg width={containerWidth} height={height}>
          {amplitudes.map((amp, index) => {
            const barH = Math.max(4, amp * height * 0.9);
            const x = index * barSpacing + (barSpacing - barWidth) / 2;
            const y = (height - barH) / 2;
            const isPlayed = index <= activeIndex;

            return (
              <Rect
                key={index}
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={barWidth / 2}
                fill={isPlayed ? activeColor : inactiveColor}
              />
            );
          })}
        </Svg>
      )}
    </Pressable>
  );
});
