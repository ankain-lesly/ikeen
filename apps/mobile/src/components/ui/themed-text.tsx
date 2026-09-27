import { Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
  className?: string;
};

const TYPE_CLASSES: Record<NonNullable<ThemedTextProps['type']>, string> = {
  default: 'text-base leading-6 font-normal',
  title: 'text-2xl leading-8 font-semibold',
  subtitle: 'text-xl leading-6 font-bold',
  small: 'text-sm leading-5 font-medium',
  smallBold: 'text-sm leading-5 font-bold',
  code: 'font-mono text-xs leading-4 font-medium',
  link: 'text-sm leading-5 font-medium text-text underline active:opacity-70',
  linkPrimary: 'text-sm leading-5 font-medium text-primary underline active:opacity-70',
};

const COLOR_CLASSES: Record<ThemeColor, string> = {
  text: 'text-text',
  textSecondary: 'text-text-secondary',
  primary: 'text-primary',
  border: 'text-border',
  background: 'text-background',
  backgroundElement: 'text-background-element',
  backgroundSelected: 'text-background-selected',
  card: 'text-card',
};

export function ThemedText({
  type = 'default',
  themeColor,
  className = '',
  style,
  ...rest
}: ThemedTextProps) {
  const typeClass = TYPE_CLASSES[type] ?? TYPE_CLASSES.default;
  const colorClass = themeColor
    ? COLOR_CLASSES[themeColor]
    : type === 'linkPrimary' || type === 'link'
      ? ''
      : 'text-text';

  return (
    <Text
      className={`${typeClass} ${colorClass} ${className}`.trim()}
      style={style}
      {...rest}
    />
  );
}
