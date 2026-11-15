-- CreateEnum
CREATE TYPE "ReminderRepeat" AS ENUM ('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom');

-- AlterEnum
ALTER TYPE "SyncEntity" ADD VALUE 'reminders';

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "note_id" TEXT,
    "title" VARCHAR(255) NOT NULL DEFAULT '',
    "due_at" TIMESTAMP(3) NOT NULL,
    "repeat" "ReminderRepeat" NOT NULL DEFAULT 'none',
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "notification_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reminders_user_id_updated_at_idx" ON "reminders"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "reminders_note_id_deleted_at_idx" ON "reminders"("note_id", "deleted_at");

-- CreateIndex
CREATE INDEX "reminders_user_id_due_at_idx" ON "reminders"("user_id", "due_at");

-- CreateIndex
CREATE INDEX "reminders_is_completed_idx" ON "reminders"("is_completed");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_note_id_fkey" FOREIGN KEY ("note_id") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
