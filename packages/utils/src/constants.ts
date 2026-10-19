export const FOLDER_PRESET_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#9333ea', // Purple
  '#ef4444', // Red
  '#f97316', // Orange
  '#0d9488', // Teal
  '#ec4899', // Pink
  '#64748b', // Slate
] as const;

export const DEFAULT_FOLDER_COLOR = '#3b82f6';

export const SYNC_CONSTANTS = {
  BATCH_SIZE: 10, // Max outbox items pushed per HTTP request
  PULL_LIMIT: 150, // Max records pulled per delta request
  MAX_RETRIES: 5,  // Max retries before outbox status transitions to 'failed'
} as const;
