import { sql } from "drizzle-orm";
import { bigint, check, date, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories.schema";
import { currenciesTable } from "./currencies.schema";
import { ledgerAccountsTable } from "./ledger-accounts.schema";
import { transactionsTable } from "./transactions.schema";

export const entriesTable = pgTable(
  "entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactionsTable.id, { onDelete: "cascade" }),
    ledgerAccountId: uuid("ledger_account_id")
      .notNull()
      .references(() => ledgerAccountsTable.id, { onDelete: "restrict" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    currencyId: varchar("currency_id", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    budgetMonth: date("budget_month", { mode: "date" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("entries_transaction_id_idx").on(table.transactionId),
    index("entries_ledger_account_id_idx").on(table.ledgerAccountId),
    index("entries_budget_month_idx").on(table.budgetMonth),
    check("entries_non_zero_amount_check", sql`${table.amount} <> 0`),
  ],
);
