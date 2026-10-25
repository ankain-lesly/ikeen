import React, { useEffect } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";

export interface AnimatedSyncBorderProps {
  status?: "pending" | "uploading" | "completed" | "failed";
  isSynced?: boolean;
  borderRadius?: number;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const AnimatedSyncBorder = React.memo(function AnimatedSyncBorder({
  status,
  isSynced,
  style = {},
  borderRadius = 24,
  children,
}: AnimatedSyncBorderProps) {
  const isUploading = status === "uploading";
  const isFailed = status === "failed";
  const isPending = status === "pending" && !isSynced;

  const colorProgress = useSharedValue(0);

  useEffect(() => {
    if (isUploading) {
      colorProgress.value = withRepeat(
        withTiming(1, {
          duration: 1000,
          easing: Easing.linear,
        }),
        -1,
        true,
      );
    } else {
      colorProgress.value = 0;
    }
  }, [isUploading, colorProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    let borderColor = "rgba(150, 150, 150, 0.18)";
    let shadowOpacity = 0;
    let shadowRadius = 0;
    let elevation = 0;

    if (isUploading) {
      borderColor = interpolateColor(
        colorProgress.value,
        [0, 0.33, 0.66, 1],
        ["#38bdf8", "#818cf8", "#c084fc", "#38bdf8"],
      );
      shadowOpacity = 0.85;
      shadowRadius = 10;
      elevation = 6;
    } else if (isFailed) {
      borderColor = "#ef4444";
    } else if (isPending) {
      borderColor = "rgba(245, 158, 11, 0.7)";
    }

    return {
      borderColor,
      borderWidth: 2,
      shadowColor: borderColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity,
      shadowRadius,
      elevation,
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { borderRadius },
        style,
        animatedStyle,
      ]}
    >
      <View style={[styles.inner, { borderRadius: borderRadius - 1 }]}>
        {children}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "visible",
  },
  inner: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
});
