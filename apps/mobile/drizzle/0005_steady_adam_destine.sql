CREATE TABLE `note_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`type` text NOT NULL,
	`position` integer NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_note_blocks_note_id_position` ON `note_blocks` (`note_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_note_blocks_note_id` ON `note_blocks` (`note_id`);