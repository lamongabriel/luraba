import { bigint, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { currenciesTable } from "./currencies.schema.js";
import { householdsTable } from "./households.schema.js";
import { uploadsTable } from "./uploads.schema.js";
import { usersTable } from "./users.schema.js";

/**
 * The household's reusable catalog of things it buys (a hamburger, a phone, butter). A transaction
 * lists them as `transaction_items`; the price here is only the latest known price.
 */
export const productsTable = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    imageUploadId: uuid("image_upload_id").references(() => uploadsTable.id, {
      onDelete: "set null",
    }),
    /** Latest known unit price in minor units; null when never priced. */
    price: bigint({ mode: "number" }),
    currencyId: varchar("currency_id", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    /** Who created the record. Null for rows that predate tracking or whose user was deleted. */
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("products_household_name_unique").on(table.householdId, table.name)],
);
