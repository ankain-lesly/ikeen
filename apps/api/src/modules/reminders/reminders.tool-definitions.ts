import { z } from 'zod';
import {
  defaultNullable,
  optionalNullable,
} from '../agent/call-options.js';

export const reminderRepeatSchema = z.enum([
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'custom',
  'interval',
]);

export const setReminderDef = {
  name: 'ikeen_set_reminder',
  description:
    'Schedule or update a time-based reminder for a note. Prompts the user with a notification at the given due date/time. Always supply a future ISO 8601 timestamp in `dueAt`.',
  inputSchema: z.object({
    noteId: z.string().describe('The UUID of the note to attach this reminder to'),
    dueAt: z
      .string()
      .describe(
        'The date and time for the reminder as an ISO 8601 string (e.g. 2026-11-10T09:00:00Z)',
      ),
    title: optionalNullable(z.string()).describe(
      'Optional reminder title or summary. If omitted, uses the note title.',
    ),
    repeat: defaultNullable(reminderRepeatSchema, 'none').describe(
      'Repeat frequency: none, daily, weekly, monthly, yearly, custom, or interval',
    ),
    repeatInterval: optionalNullable(z.number().int().min(60).max(86400)).describe(
      'For interval repeat: the recurrence interval in seconds (between 60s and 86400s / 24h, e.g. 3600 for every 1 hour, 7200 for 2 hours, 60 for 1 minute).',
    ),
    maxRepeats: optionalNullable(z.number().int().min(1).max(100)).describe(
      'For interval repeat: maximum number of times the reminder should ring before automatically completing (between 1 and 100, defaults to 10).',
    ),
  }),
};

export const listRemindersDef = {
  name: 'ikeen_list_reminders',
  description:
    'List scheduled reminders in the workspace. Can optionally filter by specific noteId or include completed reminders.',
  inputSchema: z.object({
    noteId: optionalNullable(z.string()).describe(
      'Optional note UUID to filter reminders for a specific note',
    ),
    includeCompleted: defaultNullable(z.boolean(), false).describe(
      'Whether to include already completed reminders. Defaults to false.',
    ),
    upcomingOnly: defaultNullable(z.boolean(), false).describe(
      'Filter to only future upcoming reminders (dueAt >= now). Defaults to false.',
    ),
    limit: defaultNullable(z.number().int().min(1).max(50), 20).describe(
      'Maximum number of reminders to return',
    ),
  }),
};

export const completeReminderDef = {
  name: 'ikeen_complete_reminder',
  description:
    'Mark a reminder as completed or uncompleted by reminder ID.',
  inputSchema: z.object({
    reminderId: z.string().describe('The UUID of the reminder to complete'),
    isCompleted: defaultNullable(z.boolean(), true).describe(
      'True to mark completed, false to unmark as completed',
    ),
  }),
};

export const cancelReminderDef = {
  name: 'ikeen_cancel_reminder',
  description:
    'Cancel / delete a scheduled reminder by reminder ID.',
  inputSchema: z.object({
    reminderId: z.string().describe('The UUID of the reminder to cancel/delete'),
  }),
};
