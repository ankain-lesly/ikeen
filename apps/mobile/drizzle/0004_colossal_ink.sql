ALTER TABLE `folders` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `notes` ADD `version` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `sync_outbox` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `sync_outbox` ADD `mutation_id` text NOT NULL;--> statement-breakpoint
ALTER TABLE `sync_outbox` ADD `updated_at` text NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_sync_outbox_status_created` ON `sync_outbox` (`status`,`created_at`);