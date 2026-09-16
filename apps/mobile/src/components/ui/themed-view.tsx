import { View, type ViewProps } from 'react-native';

export function ThemedView({ className = "", style, ...otherProps }: ViewProps) {
  return (
    <View className={`${className}`.trim()} style={style} {...otherProps} />
  );
}
