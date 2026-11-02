import { bigint, date, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { currenciesTable } from "./currencies.schema.js";
import { goalsTable } from "./goals.schema.js";
import { householdsTable } from "./households.schema.js";

/**
 * One projected line of a month's plan: salary, taxes, a goal contribution or the to-spend amount.
 * The month is the competency month (the first day), not a posting date.
 */
export const monthlyPlanLinesTable = pgTable(
  "monthly_plan_lines",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    /** `salary`, `taxes`, `goal` or `to_spend`. */
    kind: varchar({ length: 16 }).notNull(),
    goalId: uuid("goal_id").references(() => goalsTable.id, { onDelete: "cascade" }),
    amount: bigint({ mode: "number" }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("monthly_plan_lines_household_month_idx").on(table.householdId, table.month)],
);
