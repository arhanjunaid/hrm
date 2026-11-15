import { mysqlTable, varchar, text, date, timestamp, index, int } from "drizzle-orm/mysql-core";
import { vendors } from "./vendors";
import { users } from "./users";

/**
 * CRM communication log. Records every major touchpoint with a client or
 * prospect, starting from the day the lead was received.
 *
 * initiatedBy: CLIENT | RF
 * source: a code from the Status Masters table (entityType COMM_SOURCE).
 */
export const clientCommunications = mysqlTable(
  "client_communications",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    clientId: varchar("client_id", { length: 36 }).notNull().references(() => vendors.id),
    contactDate: date("contact_date").notNull(),
    initiatedBy: varchar("initiated_by", { length: 10 }).notNull(),
    source: varchar("source", { length: 50 }).notNull(),
    description: text("description").notNull(),
    actionRequired: text("action_required"),
    dueDate: date("due_date"),
    // Optional attachment (one file per log entry).
    fileName: varchar("file_name", { length: 255 }),
    storageKey: varchar("storage_key", { length: 500 }),
    storageProvider: varchar("storage_provider", { length: 50 }),
    mimeType: varchar("mime_type", { length: 100 }),
    fileSize: int("file_size"),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("comm_client_id_idx").on(table.clientId),
    index("comm_contact_date_idx").on(table.contactDate),
    index("comm_due_date_idx").on(table.dueDate),
  ]
);

export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type NewClientCommunication = typeof clientCommunications.$inferInsert;
