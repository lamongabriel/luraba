import { bigint, index, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts.schema";
import { creditCardProductTypeEnum } from "./enums.schema";
import { householdsTable } from "./households.schema";

export const creditCardsTable = pgTable(
  "credit_cards",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    institutionName: varchar("institution_name", { length: 255 }),
    institutionDomain: varchar("institution_domain", { length: 255 }),
    institutionLogoUrl: varchar("institution_logo_url", { length: 1024 }),
    notes: varchar({ length: 4000 }),
    ledgerAccountId: uuid("ledger_account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    ownerAccountId: uuid("owner_account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    brand: varchar({ length: 64 }).notNull(),
    productType: creditCardProductTypeEnum("product_type").notNull().default("credit"),
    last4: varchar("last4", { length: 4 }).notNull(),
    color: varchar({ length: 32 }),
    closingDay: integer("closing_day").notNull(),
    dueDay: integer("due_day").notNull(),
    creditLimitAmount: bigint("credit_limit_amount", { mode: "number" }).notNull().default(-1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("credit_cards_owner_account_id_idx").on(table.ownerAccountId),
    index("credit_cards_ledger_account_id_idx").on(table.ledgerAccountId),
    index("credit_cards_household_name_idx").on(table.householdId, table.name),
  ],
);
