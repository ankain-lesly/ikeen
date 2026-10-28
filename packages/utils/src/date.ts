export type DateInput = string | number | Date | null | undefined;

export interface DateFormatOptions {
  time?: boolean;
  year?: boolean;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Formats a Date object using token replacements:
 * - "MMM": Short month name (e.g. "Jan")
 * - "EEE": Short weekday name (e.g. "Mon")
 * - "yyyy": 4-digit year (e.g. "2026")
 * - "yy": 2-digit year (e.g. "26")
 * - "dd": 2-digit day (e.g. "12")
 * - "hh": 2-digit 12-hour (e.g. "04")
 * - "mm": 2-digit minute (e.g. "20")
 * - "a": AM/PM
 */
export function dateResultFormat(date: Date, pattern: string): string {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const hh = String(hours12).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const a = hours24 >= 12 ? "PM" : "AM";
  const EEE = WEEKDAY_NAMES[date.getDay()] ?? "";
  const MMM = MONTH_NAMES[date.getMonth()] ?? "";
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);

  const tokens: Record<string, string> = {
    yyyy,
    yy,
    MMM,
    EEE,
    dd,
    hh,
    mm,
    a,
  };

  return pattern.replace(/yyyy|yy|MMM|EEE|dd|hh|mm|\ba\b/g, (match) => tokens[match] ?? match);
}

/**
 * Safely parses any date input into a valid Date object, or returns null if invalid.
 */
export function parseDate(input: DateInput): Date | null {
  if (!input) return null;
  const date =
    typeof input === "object" && input instanceof Date ? input : new Date(input);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Checks whether a date falls on today.
 */
export function isToday(input: DateInput): boolean {
  const d = parseDate(input);
  if (!d) return false;
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

/**
 * Checks whether a date falls on yesterday.
 */
export function isYesterday(input: DateInput): boolean {
  const d = parseDate(input);
  if (!d) return false;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Checks whether a date falls within the current calendar week (Monday to Sunday).
 */
export function isThisWeek(input: DateInput): boolean {
  const d = parseDate(input);
  if (!d) return false;
  const now = new Date();

  // Start of current week (Monday at 00:00:00)
  const startOfWeek = new Date(now);
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  startOfWeek.setDate(now.getDate() - diffToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return d >= startOfWeek && d < endOfWeek;
}

/**
 * Checks whether a date is in the current calendar year.
 */
export function isThisYear(input: DateInput): boolean {
  const d = parseDate(input);
  if (!d) return false;
  return d.getFullYear() === new Date().getFullYear();
}

/**
 * Adaptive relative date for note cards and list items:
 * - Today: "Today 04:20 PM"
 * - Yesterday: "Yest 04:20 PM"
 * - This week: "Mon 04:20 PM"
 * - Older: "Jan 12, 04:10 PM" or "Jan 12, 2026" or "Jan 12"
 */
export function formatDate(
  input: DateInput,
  options: DateFormatOptions = {},
): string {
  const parsedDate = parseDate(input);
  if (!parsedDate) return "N/A";

  const showTime = options.time ?? true;
  const showYear = options.year ?? !isThisYear(parsedDate);

  // 2️⃣ TODAY
  if (isToday(parsedDate)) {
    return showTime
      ? `Today ${dateResultFormat(parsedDate, "hh:mm a")}`
      : "Today";
  }

  // 4️⃣ YESTERDAY
  if (isYesterday(parsedDate)) {
    return showTime
      ? `Yest ${dateResultFormat(parsedDate, "hh:mm a")}`
      : "Yest";
  }

  // 5️⃣ THIS WEEK — Short weekday label
  if (isThisWeek(parsedDate)) {
    return showTime
      ? dateResultFormat(parsedDate, "EEE hh:mm a")
      : dateResultFormat(parsedDate, "EEE");
  }

  // 6️⃣ OLDER — Clean and concise - using the options
  if (showYear && showTime) {
    return dateResultFormat(parsedDate, "MMM dd, yyyy, hh:mm a");
  }
  if (showYear && !showTime) {
    return dateResultFormat(parsedDate, "MMM dd, yyyy");
  }
  if (!showYear && showTime) {
    return dateResultFormat(parsedDate, "MMM dd, hh:mm a");
  }
  return dateResultFormat(parsedDate, "MMM dd");
}

/**
 * Formats date and time for note header metadata:
 * - e.g. "Oct 14, 10:30 AM"
 */
export function formatEditTime(input: DateInput, fallback = ""): string {
  const d = parseDate(input);
  if (!d) return fallback;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats full timestamp for detail dialogs and note info sheets:
 * - e.g. "October 14, 2026, 10:30 AM"
 */
export function formatFullDate(input: DateInput, fallback = "—"): string {
  const d = parseDate(input);
  if (!d) return fallback;
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Relative time representation:
 * - "Just now", "5m ago", "2h ago", "3d ago", or falls back to card date.
 */
export function formatTimeAgo(input: DateInput, {year, time}:DateFormatOptions = {}): string {
  const d = parseDate(input);
  if (!d) return "N/A";

  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);

  if (diffSec < 45) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return formatDate(d, {year,time});
}



/**
 * Test function that logs formatted dates across various scenarios
 * using a standard reference date (defaults to September 18, 2026, 09:30 AM).
 */
export function testDateFormatting(
  referenceDate: DateInput = new Date(2026, 8, 18, 9, 30),
) {
  const ref = parseDate(referenceDate) ?? new Date(2026, 8, 18, 9, 30);
  console.log(`\n=== Date Formatting Tests (Reference: ${ref.toString()}) ===\n`);

  const testCases: { label: string; date: Date; options?: DateFormatOptions }[] = [
    {
      label: "1. Today (morning)",
      date: new Date(2026, 8, 18, 8, 15),
    },
    {
      label: "2. Today (afternoon, time: true)",
      date: new Date(2026, 8, 18, 16, 20),
      options: { time: true },
    },
    {
      label: "3. Today (time: false)",
      date: new Date(2026, 8, 18, 16, 20),
      options: { time: false },
    },
    {
      label: "4. Yesterday (time: true)",
      date: new Date(2026, 8, 17, 16, 20),
    },
    {
      label: "5. Yesterday (time: false)",
      date: new Date(2026, 8, 17, 16, 20),
      options: { time: false },
    },
    {
      label: "6. This Week - Wednesday (Sep 16)",
      date: new Date(2026, 8, 16, 14, 10),
    },
    {
      label: "7. This Week - Tuesday (Sep 15, time: false)",
      date: new Date(2026, 8, 15, 11, 45),
      options: { time: false },
    },
    {
      label: "8. This Week - Monday (Sep 14)",
      date: new Date(2026, 8, 14, 9, 0),
    },
    {
      label: "9. Older - This year (Jan 12, default options)",
      date: new Date(2026, 0, 12, 16, 10),
    },
    {
      label: "10. Older - This year (Jan 12, time: false)",
      date: new Date(2026, 0, 12, 16, 10),
      options: { time: false },
    },
    {
      label: "11. Older - This year (Jan 12, year: true, time: false)",
      date: new Date(2026, 0, 12, 16, 10),
      options: { year: true, time: false },
    },
    {
      label: "12. Older - Previous year (Nov 20, 2025, default options)",
      date: new Date(2025, 10, 20, 15, 45),
    },
    {
      label: "13. Older - Previous year (Nov 20, 2025, time: false)",
      date: new Date(2025, 10, 20, 15, 45),
      options: { time: false },
    },
  ];

  for (const { label, date, options } of testCases) {
    const result = formatDate(date, { ...options });
    console.log(`${label.padEnd(54)} -> "${result}"`);
  }
}