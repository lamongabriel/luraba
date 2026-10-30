import { boolean, date, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories.schema.js";
import { transactionTypeEnum } from "./enums.schema.js";
import { householdsTable } from "./households.schema.js";
import { merchantsTable } from "./merchants.schema.js";
import { paymentMethodsTable } from "./payment-methods.schema.js";
import { usersTable } from "./users.schema.js";

export const transactionsTable = pgTable(
  "transactions",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    type: transactionTypeEnum().notNull(),
    paymentMethodId: uuid("payment_method_id").references(() => paymentMethodsTable.id, {
      onDelete: "restrict",
    }),
    categoryId: uuid("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    description: varchar({ length: 512 }).notNull(),
    includeInBudget: boolean("include_in_budget").notNull().default(true),
    merchantId: uuid("merchant_id").references(() => merchantsTable.id, { onDelete: "set null" }),
    purchaseDate: date("purchase_date", { mode: "date" }).notNull(),
    postedDate: date("posted_date", { mode: "date" }).notNull(),
    /** Who created the record. Null for rows that predate tracking or whose user was deleted. */
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("transactions_household_id_idx").on(table.householdId),
    index("transactions_payment_method_id_idx").on(table.paymentMethodId),
    index("transactions_created_by_user_id_idx").on(table.createdByUserId),
    index("transactions_posted_date_idx").on(table.postedDate),
    index("transactions_purchase_date_idx").on(table.purchaseDate),
  ],
);
