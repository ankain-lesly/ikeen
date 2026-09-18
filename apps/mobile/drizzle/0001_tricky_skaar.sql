CREATE TABLE `folders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`color` text DEFAULT '#3b82f6' NOT NULL,
	`icon` text DEFAULT 'folder' NOT NULL,
	`is_locked` integer DEFAULT false NOT NULL,
	`pin_code` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_folders_updated_at` ON `folders` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_folders_deleted_at` ON `folders` (`deleted_at`);--> statement-breakpoint
ALTER TABLE `notes` ADD `folder_id` text REFERENCES folders(id);--> statement-breakpoint
CREATE INDEX `idx_notes_folder_id` ON `notes` (`folder_id`);