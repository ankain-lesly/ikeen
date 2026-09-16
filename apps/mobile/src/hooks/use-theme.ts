import { useColorScheme } from 'react-native';
import { useCSSVariable } from 'uniwind';

/**
 * Returns reactive theme colors directly extracted from Uniwind CSS variables.
 * Automatically updates when switching between light and dark modes.
 */
export function useTheme() {
  const scheme = useColorScheme();

  const [
    background,
    foreground,
    text,
    textSecondary,
    backgroundElement,
    backgroundSelected,
    primary,
    tint,
    border,
    card,
  ] = useCSSVariable([
    '--color-background',
    '--color-foreground',
    '--color-text',
    '--color-text-secondary',
    '--color-background-element',
    '--color-background-selected',
    '--color-primary',
    '--color-tint',
    '--color-border',
    '--color-card',
  ]);

  const colors = {
    background: background as string,
    foreground: foreground as string,
    text: text as string,
    textSecondary: textSecondary as string,
    backgroundElement: backgroundElement as string,
    backgroundSelected: backgroundSelected as string,
    primary: primary as string,
    tint: tint as string,
    border: border as string,
    card: card as string,
  };

  return { colors, scheme };
}
