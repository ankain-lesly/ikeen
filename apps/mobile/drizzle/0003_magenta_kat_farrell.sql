ALTER TABLE `folders` ADD `user_id` text;--> statement-breakpoint
CREATE INDEX `idx_folders_user_id` ON `folders` (`user_id`);--> statement-breakpoint
ALTER TABLE `notes` ADD `user_id` text;--> statement-breakpoint
CREATE INDEX `idx_notes_user_id` ON `notes` (`user_id`);