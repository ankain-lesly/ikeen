declare const __DEV__: boolean | undefined;
declare const process: { env?: { NODE_ENV?: string } } | undefined;

/**
 * Improved Pretty Console Log for Debug/Tests.
 * Works universally across React Native (__DEV__), Node.js, and browser environments.
 */
export function log(...data: unknown[]) {
  const isDev =
    typeof __DEV__ !== "undefined"
      ? Boolean(__DEV__)
      : typeof process !== "undefined" &&
        process.env &&
        process.env.NODE_ENV !== "production";

  if (!isDev) return;

  const prettyData = data
    .map((d) => {
      if (d === null || d === undefined) return String(d);
      if (typeof d === "object" || typeof d === "bigint") {
        try {
          return JSON.stringify(
            d,
            (_key, value) =>
              value === "[Circular Reference]" ? "[Circular]" : value,
            2,
          );
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          return `[Error stringifying: ${message}]`;
        }
      }
      return String(d);
    })
    .join("\n");

  if (prettyData) {
    console.log(prettyData);
  }
}
