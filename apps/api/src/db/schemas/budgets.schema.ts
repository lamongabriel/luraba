import { bigint, date, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories.schema";
import { householdsTable } from "./households.schema";

export const budgetsTable = pgTable(
  "budgets",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    month: date("month", { mode: "date" }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "restrict" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("budgets_household_month_category_unique").on(
      table.householdId,
      table.month,
      table.categoryId,
    ),
  ],
);
