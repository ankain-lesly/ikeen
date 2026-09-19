CREATE TABLE `sync_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
CREATE INDEX `idx_sync_outbox_created_at` ON `sync_outbox` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_sync_outbox_entity` ON `sync_outbox` (`entity`,`entity_id`);