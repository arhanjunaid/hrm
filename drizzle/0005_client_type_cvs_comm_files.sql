ALTER TABLE `client_communications` MODIFY COLUMN `source` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `client_type` varchar(1) DEFAULT 'C' NOT NULL;--> statement-breakpoint
ALTER TABLE `client_communications` ADD `file_name` varchar(255);--> statement-breakpoint
ALTER TABLE `client_communications` ADD `storage_key` varchar(500);--> statement-breakpoint
ALTER TABLE `client_communications` ADD `storage_provider` varchar(50);--> statement-breakpoint
ALTER TABLE `client_communications` ADD `mime_type` varchar(100);--> statement-breakpoint
ALTER TABLE `client_communications` ADD `file_size` int;--> statement-breakpoint
ALTER TABLE `files` ADD `description` varchar(255);--> statement-breakpoint
ALTER TABLE `files` ADD `is_obsolete` boolean DEFAULT false NOT NULL;--> statement-breakpoint
INSERT IGNORE INTO `status_masters` (`id`, `entity_type`, `code`, `description`, `result`, `client_id`, `sort_order`, `is_active`, `is_system`, `allowed_next`, `created_at`, `updated_at`) VALUES
('sm-src-01', 'COMM_SOURCE', 'FOLLOW_UP', 'Follow-up', 'PENDING', NULL, 1, true, true, NULL, NOW(), NOW()),
('sm-src-02', 'COMM_SOURCE', 'WEB_ENQUIRY', 'Web enquiry', 'PENDING', NULL, 2, true, true, NULL, NOW(), NOW()),
('sm-src-03', 'COMM_SOURCE', 'RECOMMENDATION', 'Recommendation', 'PENDING', NULL, 3, true, true, NULL, NOW(), NOW()),
('sm-src-04', 'COMM_SOURCE', 'LINKEDIN', 'LinkedIn', 'PENDING', NULL, 4, true, true, NULL, NOW(), NOW()),
('sm-src-05', 'COMM_SOURCE', 'EMAIL_MARKETING', 'Email Marketing', 'PENDING', NULL, 5, true, true, NULL, NOW(), NOW()),
('sm-src-06', 'COMM_SOURCE', 'OTHERS', 'Others', 'PENDING', NULL, 6, true, true, NULL, NOW(), NOW());