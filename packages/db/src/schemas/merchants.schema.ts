import { pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { householdsTable } from "./households.schema.js";
import { uploadsTable } from "./uploads.schema.js";
import { usersTable } from "./users.schema.js";

export const merchantsTable = pgTable(
  "merchants",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    domain: varchar({ length: 255 }),
    logoUrl: varchar("logo_url", { length: 512 }),
    imageUploadId: uuid("image_upload_id").references(() => uploadsTable.id, {
      onDelete: "set null",
    }),
    /** Who created the record. Null for rows that predate tracking or whose user was deleted. */
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("merchants_household_name_unique").on(table.householdId, table.name)],
);
