PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inspection` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`inspector_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`decision` text,
	`rejection_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `article`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inspector_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_inspection`("id", "article_id", "inspector_id", "status", "decision", "rejection_reason", "created_at", "updated_at") SELECT "id", "article_id", "inspector_id", "status", "decision", "rejection_reason", "created_at", "updated_at" FROM `inspection`;--> statement-breakpoint
DROP TABLE `inspection`;--> statement-breakpoint
ALTER TABLE `__new_inspection` RENAME TO `inspection`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `inspection_article_id_unique` ON `inspection` (`article_id`);--> statement-breakpoint
CREATE INDEX `inspection_inspectorId_idx` ON `inspection` (`inspector_id`);--> statement-breakpoint
ALTER TABLE `status_event` ADD `actor_id` text REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `status_event` ADD `source` text DEFAULT 'systeme' NOT NULL;--> statement-breakpoint
ALTER TABLE `status_event` ADD `notification_message` text;--> statement-breakpoint
ALTER TABLE `status_event` ADD `event_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `status_event_event_key_unique` ON `status_event` (`event_key`);--> statement-breakpoint
CREATE INDEX `statusEvent_actorId_idx` ON `status_event` (`actor_id`);