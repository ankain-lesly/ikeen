ALTER TABLE `reminders` ADD `repeat_interval` integer;--> statement-breakpoint
ALTER TABLE `reminders` ADD `max_repeats` integer;--> statement-breakpoint
ALTER TABLE `reminders` ADD `repeat_count` integer DEFAULT 0 NOT NULL;