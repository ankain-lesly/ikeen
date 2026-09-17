
/**
 *
 * Development Only Testing LOGs
 */
// global.log = (...data: unknown[]) => {
//   log(data);
// };

// Improved Pretty Console Log for Debug/Tests
export function log(...data: unknown[]) {
  if (!__DEV__) return;

  const prettyData = data
    .map((d) => {
      if (d === null || d === undefined) return String(d); // Handle null/undefined >
      if (typeof d === "object" || typeof d === "bigint") {
        try {
          // Handle circular refs: replace with '[Circular]' or skip
          return JSON.stringify(
            d,
            (key, value) =>
              value === "[Circular Reference]" ? "[Circular]" : value,
            2,
          );
        } catch (e: any) {
          return `[Error stringifying: ${e.message}]`;
        }
      }
      return String(d); // Coerce primitives to string for consistency
    })
    .join("\n"); // Join with \n to avoid console.log spaces

  if (prettyData) {
    console.log(prettyData); // Single call, no extra newlines
  }
}
