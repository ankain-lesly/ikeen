import React from "react";
import { View, ViewProps } from "react-native";

type CardWrapperProps = ViewProps & {
  children: React.ReactNode;
  elevation?: number;
  borderRadius?: number;
  className?: any;
};

export function Card({
  children,
  className,
  elevation = 2,
  borderRadius = 12,
  style,
  ...rest
}: CardWrapperProps) {
  return (
    <View
    className={`p-2 rounded-2xl border border-border bg-card overflow-hidden ${className}`}
      style={[
        {
          // borderRadius,
          // // Android shadow
          // elevation,
          // // iOS shadow
          // shadowColor: "#000",
          // shadowOffset: { width: 0, height: elevation },
          // shadowOpacity: 0.1 + 0.05 * elevation,
          // shadowRadius: 4 + elevation
        },
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}