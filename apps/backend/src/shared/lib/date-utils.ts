/**
 * Date utility functions for handling common date operations
 * No external dependencies - uses native JavaScript Date methods
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateFilters {
  startDate?: Date;
  endDate?: Date;
  period?:
    | "today"
    | "yesterday"
    | "last7days"
    | "last30days"
    | "last90days"
    | "thisMonth"
    | "lastMonth"
    | "thisYear"
    | "custom";
  timezone?: string;
}

/**
 * Get start of day (00:00:00.000)
 */
export const getStartOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day (23:59:59.999)
 */
export const getEndOfDay = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of week (Monday)
 */
export const getStartOfWeek = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is 1, Sunday is 0
  d.setDate(diff);
  return getStartOfDay(d);
};

/**
 * Get end of week (Sunday)
 */
export const getEndOfWeek = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Sunday is 0
  d.setDate(diff);
  return getEndOfDay(d);
};

/**
 * Get start of month
 */
export const getStartOfMonth = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setDate(1);
  return getStartOfDay(d);
};

/**
 * Get end of month
 */
export const getEndOfMonth = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0); // Last day of current month
  return getEndOfDay(d);
};

/**
 * Get start of year
 */
export const getStartOfYear = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setMonth(0, 1);
  return getStartOfDay(d);
};

/**
 * Get end of year
 */
export const getEndOfYear = (date: Date = new Date()): Date => {
  const d = new Date(date);
  d.setMonth(11, 31);
  return getEndOfDay(d);
};

/**
 * Get date N days ago
 */
export const getDaysAgo = (days: number, fromDate: Date = new Date()): Date => {
  const d = new Date(fromDate);
  d.setDate(d.getDate() - days);
  return d;
};

/**
 * Get date N days from now
 */
export const getDaysFromNow = (
  days: number,
  fromDate: Date = new Date()
): Date => {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Get date N months ago
 */
export const getMonthsAgo = (
  months: number,
  fromDate: Date = new Date()
): Date => {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() - months);
  return d;
};

/**
 * Get date N months from now
 */
export const getMonthsFromNow = (
  months: number,
  fromDate: Date = new Date()
): Date => {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + months);
  return d;
};

/**
 * Calculate difference between two dates in days
 */
export const getDaysDifference = (startDate: Date, endDate: Date): number => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate difference between two dates in hours
 */
export const getHoursDifference = (startDate: Date, endDate: Date): number => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60));
};

/**
 * Calculate difference between two dates in minutes
 */
export const getMinutesDifference = (
  startDate: Date,
  endDate: Date
): number => {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60));
};

/**
 * Check if date is today
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.toDateString() === today.toDateString();
};

/**
 * Check if date is yesterday
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = getDaysAgo(1);
  return date.toDateString() === yesterday.toDateString();
};

/**
 * Check if date is this week
 */
export const isThisWeek = (date: Date): boolean => {
  const startOfWeek = getStartOfWeek();
  const endOfWeek = getEndOfWeek();
  return date >= startOfWeek && date <= endOfWeek;
};

/**
 * Check if date is this month
 */
export const isThisMonth = (date: Date): boolean => {
  const startOfMonth = getStartOfMonth();
  const endOfMonth = getEndOfMonth();
  return date >= startOfMonth && date <= endOfMonth;
};

/**
 * Get predefined date ranges
 */
export const getDateRange = (filters: DateFilters): DateRange => {
  const now = new Date();

  switch (filters.period) {
    case "today":
      return {
        start: getStartOfDay(now),
        end: getEndOfDay(now),
      };

    case "yesterday":
      const yesterday = getDaysAgo(1);
      return {
        start: getStartOfDay(yesterday),
        end: getEndOfDay(yesterday),
      };

    case "last7days":
      return {
        start: getStartOfDay(getDaysAgo(6)),
        end: getEndOfDay(now),
      };

    case "last30days":
      return {
        start: getStartOfDay(getDaysAgo(29)),
        end: getEndOfDay(now),
      };

    case "last90days":
      return {
        start: getStartOfDay(getDaysAgo(89)),
        end: getEndOfDay(now),
      };

    case "thisMonth":
      return {
        start: getStartOfMonth(now),
        end: getEndOfMonth(now),
      };

    case "lastMonth":
      const lastMonth = getMonthsAgo(1);
      return {
        start: getStartOfMonth(lastMonth),
        end: getEndOfMonth(lastMonth),
      };

    case "thisYear":
      return {
        start: getStartOfYear(now),
        end: getEndOfYear(now),
      };

    case "custom":
      return {
        start: filters.startDate || getStartOfDay(now),
        end: filters.endDate || getEndOfDay(now),
      };

    default:
      // Default to last 7 days
      return {
        start: getStartOfDay(getDaysAgo(6)),
        end: getEndOfDay(now),
      };
  }
};

/**
 * Format date to readable string
 */
export const formatDate = (
  date: Date,
  format: "short" | "long" | "iso" | "time" = "short"
): string => {
  switch (format) {
    case "short":
      return date.toLocaleDateString();

    case "long":
      return date.toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

    case "iso":
      return date.toISOString();

    case "time":
      return date.toLocaleTimeString();

    default:
      return date.toLocaleDateString();
  }
};

/**
 * Parse date string to Date object
 */
export const parseDate = (dateString: string): Date => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error("Invalid date string");
  }
  return date;
};

/**
 * Get time slots for time-based analytics
 */
export const getTimeSlot = (hour: number): string => {
  const timeSlots: Record<number, string> = {
    0: "12-2 AM",
    1: "2-4 AM",
    2: "4-6 AM",
    3: "6-8 AM",
    4: "8-10 AM",
    5: "10-12 PM",
    6: "12-2 PM",
    7: "2-4 PM",
    8: "4-6 PM",
    9: "6-8 PM",
    10: "8-10 PM",
    11: "10-12 AM",
  };

  return timeSlots[hour] || "6-8 PM";
};

/**
 * Check if date is within range
 */
export const isDateInRange = (
  date: Date,
  startDate: Date,
  endDate: Date
): boolean => {
  return date >= startDate && date <= endDate;
};

/**
 * Get quarter of the year
 */
export const getQuarter = (date: Date = new Date()): number => {
  return Math.ceil((date.getMonth() + 1) / 3);
};

/**
 * Get start of quarter
 */
export const getStartOfQuarter = (date: Date = new Date()): Date => {
  const quarter = getQuarter(date);
  const month = (quarter - 1) * 3;
  const d = new Date(date.getFullYear(), month, 1);
  return getStartOfDay(d);
};

/**
 * Get end of quarter
 */
export const getEndOfQuarter = (date: Date = new Date()): Date => {
  const quarter = getQuarter(date);
  const month = quarter * 3 - 1;
  const d = new Date(date.getFullYear(), month + 1, 0);
  return getEndOfDay(d);
};
