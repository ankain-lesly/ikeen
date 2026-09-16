import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor | 'card';
  className?: string;
};

const BG_CLASSES: Record<ThemeColor | 'card', string> = {
  background: 'bg-background',
  backgroundElement: 'bg-background-element',
  backgroundSelected: 'bg-background-selected',
  card: 'bg-card',
  primary: 'bg-primary',
  border: 'bg-border',
  text: 'bg-text',
  textSecondary: 'bg-text-secondary',
};

export function ThemedView({
  type = 'background',
  className = '',
  style,
  ...otherProps
}: ThemedViewProps) {
  const bgClass = BG_CLASSES[type] ?? BG_CLASSES.background;

  return (
    <View
      className={`${bgClass} ${className}`.trim()}
      style={style}
      {...otherProps}
    />
  );
}
