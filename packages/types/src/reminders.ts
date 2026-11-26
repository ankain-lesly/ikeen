export type ReminderRepeat =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom'
  | 'interval';

export interface Reminder {
  id: string;
  userId?: string | null;
  noteId?: string | null;
  title: string;
  dueAt: string; // ISO-8601 UTC string
  repeat: ReminderRepeat;
  /**
   * Sub-daily periodic interval duration in seconds.
   * Clamped strictly between 60 seconds (1 minute) and 86,400 seconds (24 hours).
   */
  repeatInterval?: number | null;
  /**
   * Maximum repeat cycle iterations (e.g. 1 to 100).
   * Once reached, recurrence terminates and marks isCompleted = true.
   */
  maxRepeats?: number | null;
  /**
   * Number of recurrence cycles completed so far (starts at 0).
   */
  repeatCount?: number;
  isCompleted: boolean;
  notificationId?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type CreateReminderInput = Omit<
  Reminder,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isCompleted'
> & {
  id?: string;
  isCompleted?: boolean;
};

export type UpdateReminderInput = Partial<
  Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>
>;
