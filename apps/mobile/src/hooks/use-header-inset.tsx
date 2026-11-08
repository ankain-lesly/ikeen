import React, { useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import {
  useSafeAreaInsets,
  type EdgeInsets,
} from "react-native-safe-area-context";
import { useTheme } from "./use-theme";
import { LinearGradient } from "expo-linear-gradient";
import { hex2RGBA } from "@repo/utils";

export interface HeaderInsetOptions {
  /**
   * Base height of the header interactive content (excluding status bar).
   * @default 44
   */
  height?: number;
  /**
   * Additional spacing or padding offset (e.g., extra gap before content).
   * @default 0
   */
  offset?: number;
}

export interface UseHeaderInsetReturn {
  insets: EdgeInsets;
  height: number;
  insetHeight: number;
  scrollIndicatorInsets: { top: number };
}

export function useHeaderInset(
  optionsOrHeight: number | HeaderInsetOptions = 44,
): UseHeaderInsetReturn {
  const options =
    typeof optionsOrHeight === "number"
      ? { height: optionsOrHeight }
      : optionsOrHeight;
  const { height = 44, offset = 0 } = options;

  const insets = useSafeAreaInsets();

  return useMemo(() => {
    const insetHeight = insets.top + height + offset;

    return {
      insets,
      height,
      insetHeight,
      scrollIndicatorInsets: { top: insetHeight },
    };
  }, [insets, height, offset]);
}

export interface HeaderGradientProps {
  /**
   * Custom gradient colors.
   * Defaults to: `[colors.background, colors.background, hex2RGBA(safeHex, 0.8), "transparent"]`
   */
  colors?: readonly [string, string, ...string[]];
  /**
   * Custom color stop locations (0 to 1).
   * Defaults to: `[0.65, 0.75, 0.83, 1]`
   */
  locations?: readonly [number, number, ...number[]];
  /**
   * Additional distance (in pixels) for the gradient to extend past the bottom of the header.
   * Useful for screens with deep fade requirements.
   * @default 0
   */
  featherOffset?: number;
  /**
   * Optional custom style override.
   */
  style?: StyleProp<ViewStyle>;
}

export const HeaderGradient = React.memo(function HeaderGradient({
  colors: customColors,
  locations = [0.65, 0.75, 0.83, 1],
  featherOffset = 0,
  style,
}: HeaderGradientProps) {
  const themeColors = useTheme();

  const defaultColors = useMemo(() => {
    const bg = themeColors.background;
    const safeHex = bg?.startsWith("#") ? bg : "#000000";
    return [bg, bg, hex2RGBA(safeHex, 0.8), "transparent"] as const;
  }, [themeColors.background]);

  return (
    <LinearGradient
      pointerEvents="none"
      colors={customColors || defaultColors}
      locations={locations}
      style={[
        StyleSheet.absoluteFill,
        featherOffset > 0 ? { bottom: -featherOffset } : undefined,
        style,
      ]}
    />
  );
});
