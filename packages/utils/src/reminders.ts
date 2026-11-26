export type ReminderRepeat =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom'
  | 'interval';

export interface FormattedReminder {
  text: string;
  chipLabel: string;
  isOverdue: boolean;
  isRepeating: boolean;
  repeatLabel: string | null;
}

/**
 * Strictly parses a clock time selection (hours & minutes) into seconds,
 * clamped between a minimum of 60 seconds (OS repeating notification trigger minimum)
 * and a maximum of 86,400 seconds (24 hours).
 */
export function parseClockToSeconds(hours: number, minutes: number): number {
  const h = Number.isFinite(hours) ? Math.max(0, hours) : 0;
  const m = Number.isFinite(minutes) ? Math.max(0, minutes) : 0;
  const total = h * 3600 + m * 60;
  return Math.min(86400, Math.max(60, total));
}

/**
 * Formats a duration in seconds into a clean, human-readable interval string.
 * Examples: 60 -> "1m", 120 -> "2m", 3600 -> "1h", 5400 -> "1h 30m".
 */
export function formatIntervalSeconds(seconds: number): string {
  if (!seconds || seconds <= 0) return '1m';
  if (seconds < 3600) {
    const mins = Math.max(1, Math.round(seconds / 60));
    return `${mins}m`;
  }
  const hrs = Math.floor(seconds / 3600);
  const remainingMins = Math.round((seconds % 3600) / 60);
  if (remainingMins === 0) return `${hrs}h`;
  return `${hrs}h ${remainingMins}m`;
}

/**
 * Advances a due date by one recurring interval.
 */
export function computeNextDueAt(
  currentDueAt: string,
  repeat: ReminderRepeat,
  repeatInterval?: number | null
): string {
  const date = new Date(currentDueAt);
  if (isNaN(date.getTime())) return new Date().toISOString();

  const next = new Date(date);
  if (repeat === 'interval' && repeatInterval && repeatInterval >= 60) {
    next.setTime(next.getTime() + repeatInterval * 1000);
    return next.toISOString();
  }

  switch (repeat) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return currentDueAt;
  }
  return next.toISOString();
}

/**
 * Multi-step catchup reconciler for interval-based reminders with maximum repeat capping.
 * If elapsed cycles exceed remaining allowed iterations, marks isExhausted = true
 * so the reminder can be terminated.
 */
export function reconcileIntervalOccurrence(
  dueAt: string,
  repeatInterval: number,
  maxRepeats: number = 10,
  currentCount: number = 0,
  now: Date = new Date()
): { nextDueAt: string; nextCount: number; isExhausted: boolean } {
  const due = new Date(dueAt).getTime();
  const safeInterval = Math.max(60, repeatInterval);
  const stepMs = safeInterval * 1000;
  const elapsedCycles = Math.max(1, Math.ceil((now.getTime() - due) / stepMs));
  const remainingAllowed = Math.max(0, maxRepeats - currentCount);

  if (elapsedCycles >= remainingAllowed) {
    return {
      nextDueAt: dueAt,
      nextCount: maxRepeats,
      isExhausted: true,
    };
  }

  return {
    nextDueAt: new Date(due + elapsedCycles * stepMs).toISOString(),
    nextCount: currentCount + elapsedCycles,
    isExhausted: false,
  };
}

/**
 * Computes the next upcoming future occurrence for recurring reminders.
 * If the current due date has already passed, it fast-forwards until > afterDate.
 */
export function getNextOccurrence(
  dueAt: string,
  repeat: ReminderRepeat,
  afterDate: Date = new Date(),
  repeatInterval?: number | null
): string {
  if (!repeat || repeat === 'none') return dueAt;

  let current = new Date(dueAt);
  if (isNaN(current.getTime())) return new Date().toISOString();

  // Guard against infinite loop if interval calculation does not advance
  let iterations = 0;
  while (current.getTime() <= afterDate.getTime() && iterations < 500) {
    const nextIso = computeNextDueAt(current.toISOString(), repeat, repeatInterval);
    const nextDate = new Date(nextIso);
    if (nextDate.getTime() <= current.getTime()) break;
    current = nextDate;
    iterations++;
  }
  return current.toISOString();
}

/**
 * Formats a reminder for cards, badges, and editor pills with comprehensive repeat awareness.
 */
export function formatReminderDisplay(
  dueAt: string,
  repeat: ReminderRepeat = 'none',
  repeatIntervalOrNow?: number | Date | null,
  maxRepeats?: number | null,
  repeatCount?: number,
  nowDate: Date = new Date()
): FormattedReminder {
  let repeatInterval: number | null | undefined;
  let now: Date = nowDate;

  if (repeatIntervalOrNow instanceof Date) {
    now = repeatIntervalOrNow;
  } else {
    repeatInterval = repeatIntervalOrNow;
  }

  const due = new Date(dueAt);
  if (isNaN(due.getTime())) {
    return {
      text: 'Reminder',
      chipLabel: 'Reminder',
      isOverdue: false,
      isRepeating: false,
      repeatLabel: null,
    };
  }

  const isRepeating = Boolean(repeat && repeat !== 'none');
  const isOverdue = !isRepeating && due.getTime() < now.getTime();

  const timeStr = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const isToday =
    due.getDate() === now.getDate() &&
    due.getMonth() === now.getMonth() &&
    due.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow =
    due.getDate() === tomorrow.getDate() &&
    due.getMonth() === tomorrow.getMonth() &&
    due.getFullYear() === tomorrow.getFullYear();

  let repeatLabel: string | null = null;
  let text = '';
  let chipLabel = '';

  if (repeat === 'interval' && repeatInterval) {
    const intervalStr = formatIntervalSeconds(repeatInterval);
    const countInfo = maxRepeats ? ` (${(repeatCount ?? 0) + 1}/${maxRepeats})` : '';
    repeatLabel = `Every ${intervalStr}`;
    chipLabel = `Every ${intervalStr}${countInfo}`;
    text = `Repeats every ${intervalStr}${countInfo} • Next: ${timeStr}`;
    return { text, chipLabel, isOverdue: false, isRepeating: true, repeatLabel };
  }

  switch (repeat) {
    case 'daily':
      repeatLabel = 'Daily';
      chipLabel = `Daily ${timeStr}`;
      text = `Repeats Daily • Next: ${isToday ? 'Today' : isTomorrow ? 'Tomorrow' : due.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${timeStr}`;
      break;
    case 'weekly': {
      const weekday = due.toLocaleDateString([], { weekday: 'short' });
      repeatLabel = 'Weekly';
      chipLabel = `Every ${weekday} ${timeStr}`;
      text = `Repeats Weekly (${weekday}) • Next: ${due.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
      break;
    }
    case 'monthly': {
      const day = due.getDate();
      repeatLabel = 'Monthly';
      chipLabel = `Monthly ${day}th ${timeStr}`;
      text = `Repeats Monthly (Day ${day}) • Next: ${due.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
      break;
    }
    case 'yearly':
      repeatLabel = 'Yearly';
      chipLabel = `Yearly ${timeStr}`;
      text = `Repeats Yearly • Next: ${due.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
      break;
    default:
      if (isOverdue) {
        chipLabel = `Overdue (${due.toLocaleDateString([], { month: 'short', day: 'numeric' })})`;
        text = `Overdue: ${due.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeStr}`;
      } else if (isToday) {
        chipLabel = `Tdy ${timeStr}`;
        text = `Today at ${timeStr}`;
      } else if (isTomorrow) {
        chipLabel = `Tmr ${timeStr}`;
        text = `Tomorrow at ${timeStr}`;
      } else {
        const dateStr = due.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        chipLabel = `${dateStr} ${timeStr}`;
        text = `${dateStr} at ${timeStr}`;
      }
      break;
  }

  return { text, chipLabel, isOverdue, isRepeating, repeatLabel };
}
