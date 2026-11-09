CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`note_id` text,
	`title` text DEFAULT '' NOT NULL,
	`due_at` text NOT NULL,
	`repeat` text DEFAULT 'none' NOT NULL,
	`is_completed` integer DEFAULT false NOT NULL,
	`notification_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reminders_user_id` ON `reminders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_reminders_note_id` ON `reminders` (`note_id`);--> statement-breakpoint
CREATE INDEX `idx_reminders_due_at` ON `reminders` (`due_at`);--> statement-breakpoint
CREATE INDEX `idx_reminders_completed` ON `reminders` (`is_completed`);--> statement-breakpoint
CREATE INDEX `idx_reminders_deleted_at` ON `reminders` (`deleted_at`);