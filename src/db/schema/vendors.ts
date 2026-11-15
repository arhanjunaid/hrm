import { mysqlTable, varchar, timestamp, text, int } from "drizzle-orm/mysql-core";

export const vendors = mysqlTable("vendors", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  // Client vs prospect flag: C = Client, P = Prospect.
  clientType: varchar("client_type", { length: 1 }).notNull().default("C"),
  contactName: varchar("contact_name", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"),
  // CRM prospect stage: COLD_PROSPECT | CLOSED_PROSPECT | HOT_PROSPECT |
  // SIGNED_UP_CLIENT | ACTIVE_CLIENT | DORMANT_CLIENT. New clients default to Cold Prospect.
  crmStatus: varchar("crm_status", { length: 30 }).notNull().default("COLD_PROSPECT"),
  // Signed contract (one per client). Bytes live in the configured storage
  // provider; only metadata is stored here.
  contractFileName: varchar("contract_file_name", { length: 255 }),
  contractStorageKey: varchar("contract_storage_key", { length: 500 }),
  contractStorageProvider: varchar("contract_storage_provider", { length: 50 }),
  contractMimeType: varchar("contract_mime_type", { length: 100 }),
  contractFileSize: int("contract_file_size"),
  // Plain column (no FK): vendors ↔ users would form a reference cycle.
  // Same convention as files.submissionId.
  contractUploadedBy: varchar("contract_uploaded_by", { length: 36 }),
  contractUploadedAt: timestamp("contract_uploaded_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
