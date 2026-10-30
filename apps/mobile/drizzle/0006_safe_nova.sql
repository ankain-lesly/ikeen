CREATE TABLE `media_sync_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`block_id` text NOT NULL,
	`local_uri` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_media_sync_outbox_status` ON `media_sync_outbox` (`status`);--> statement-breakpoint
CREATE INDEX `idx_media_sync_outbox_block_id` ON `media_sync_outbox` (`block_id`);