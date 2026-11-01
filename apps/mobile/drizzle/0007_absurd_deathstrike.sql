ALTER TABLE `note_blocks` ADD `deleted_at` text;--> statement-breakpoint
CREATE INDEX `idx_note_blocks_deleted_at` ON `note_blocks` (`deleted_at`);