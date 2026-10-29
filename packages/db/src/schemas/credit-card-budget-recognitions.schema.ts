import { bigint, date, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories.schema.js";
import { creditCardInstallmentsTable } from "./credit-card-installments.schema.js";
import { creditCardPurchasesTable } from "./credit-card-purchases.schema.js";
import { currenciesTable } from "./currencies.schema.js";

export const creditCardBudgetRecognitionsTable = pgTable(
  "credit_card_budget_recognitions",
  {
    id: uuid().primaryKey().defaultRandom(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => creditCardPurchasesTable.id, { onDelete: "cascade" }),
    installmentId: uuid("installment_id").references(() => creditCardInstallmentsTable.id, {
      onDelete: "cascade",
    }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "restrict" }),
    currencyId: varchar("currency_id", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    budgetMonth: date("budget_month", { mode: "date" }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("credit_card_budget_recognitions_budget_month_idx").on(table.budgetMonth)],
);
