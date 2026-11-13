CREATE TABLE `client_communications` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`contact_date` date NOT NULL,
	`initiated_by` varchar(10) NOT NULL,
	`source` varchar(30) NOT NULL,
	`description` text NOT NULL,
	`action_required` text,
	`due_date` date,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vendors` ADD `crm_status` varchar(30) DEFAULT 'COLD_PROSPECT' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `contract_file_name` varchar(255);--> statement-breakpoint
ALTER TABLE `vendors` ADD `contract_storage_key` varchar(500);--> statement-breakpoint
ALTER TABLE `vendors` ADD `contract_storage_provider` varchar(50);--> statement-breakpoint
ALTER TABLE `vendors` ADD `contract_mime_type` varchar(100);--> statement-breakpoint
ALTER TABLE `vendors` ADD `contract_file_size` int;--> statement-breakpoint
ALTER TABLE `vendors` ADD `contract_uploaded_by` varchar(36);--> statement-breakpoint
ALTER TABLE `vendors` ADD `contract_uploaded_at` timestamp;--> statement-breakpoint
ALTER TABLE `client_communications` ADD CONSTRAINT `client_communications_client_id_vendors_id_fk` FOREIGN KEY (`client_id`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_communications` ADD CONSTRAINT `client_communications_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `comm_client_id_idx` ON `client_communications` (`client_id`);--> statement-breakpoint
CREATE INDEX `comm_contact_date_idx` ON `client_communications` (`contact_date`);--> statement-breakpoint
CREATE INDEX `comm_due_date_idx` ON `client_communications` (`due_date`);
