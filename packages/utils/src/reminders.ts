export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface FormattedReminder {
  text: string;
  chipLabel: string;
  isOverdue: boolean;
  isRepeating: boolean;
  repeatLabel: string | null;
}

/**
 * Advances a due date by one recurring interval.
 */
export function computeNextDueAt(currentDueAt: string, repeat: ReminderRepeat): string {
  const date = new Date(currentDueAt);
  if (isNaN(date.getTime())) return new Date().toISOString();

  const next = new Date(date);
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
 * Computes the next upcoming future occurrence for recurring reminders.
 * If the current due date has already passed, it fast-forwards until > afterDate.
 */
export function getNextOccurrence(
  dueAt: string,
  repeat: ReminderRepeat,
  afterDate: Date = new Date()
): string {
  if (!repeat || repeat === 'none') return dueAt;

  let current = new Date(dueAt);
  if (isNaN(current.getTime())) return new Date().toISOString();

  // Guard against infinite loop if interval calculation does not advance
  let iterations = 0;
  while (current.getTime() <= afterDate.getTime() && iterations < 500) {
    const nextIso = computeNextDueAt(current.toISOString(), repeat);
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
  now: Date = new Date()
): FormattedReminder {
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
