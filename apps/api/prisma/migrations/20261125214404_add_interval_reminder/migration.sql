-- AlterEnum
ALTER TYPE "ReminderRepeat" ADD VALUE 'interval';

-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "max_repeats" INTEGER,
ADD COLUMN     "repeat_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repeat_interval" INTEGER;
