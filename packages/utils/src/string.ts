/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncates a string to a maximum length with an optional suffix.
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix = "...",
): string {
  if (!str || str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + suffix;
}

/**
 * Generates a URL/slug-friendly version of a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Counts words in a text string.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/**
 * Calculates estimated reading time in minutes for a given text.
 * Assumes average reading speed of 200 words per minute.
 */
export function calculateReadingTime(text: string, wpm = 200): number {
  const words = countWords(text);
  if (words === 0) return 0;
  return Math.max(1, Math.ceil(words / wpm));
}

/**
 * Convert color from hex to rgba
 * @param hex color value of hex e.g. #000000
 * @param alpha color alphase e0 - 1 e.g. 0.45
 * @returns 
 */
export const hex2RGBA = (hex: string, alpha: number) => {
  // Remove the '#' if it's there
  const cleanHex = hex.replace("#", "");

  // Parse r, g, b values from the hex string
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
