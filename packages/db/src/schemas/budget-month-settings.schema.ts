import { date, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { creditExpenseTimingEnum, creditInstallmentBudgetModeEnum } from "./enums.schema.js";
import { householdsTable } from "./households.schema.js";

/**
 * Per-month overrides of the household credit-card budget defaults. A null column means "use the
 * household default". The month is the purchase month the override applies to.
 */
export const budgetMonthSettingsTable = pgTable(
  "budget_month_settings",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    creditExpenseTiming: creditExpenseTimingEnum("credit_expense_timing"),
    creditInstallmentBudgetMode: creditInstallmentBudgetModeEnum("credit_installment_budget_mode"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("budget_month_settings_household_month_unique").on(table.householdId, table.month),
  ],
);
