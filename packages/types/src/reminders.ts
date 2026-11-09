export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  id: string;
  userId?: string | null;
  noteId?: string | null;
  title: string;
  dueAt: string; // ISO-8601 UTC string
  repeat: ReminderRepeat;
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
