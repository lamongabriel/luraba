import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts.schema.js";
import { currenciesTable } from "./currencies.schema.js";
import { goalKindEnum, goalStatusEnum } from "./enums.schema.js";
import { householdsTable } from "./households.schema.js";
import { transactionsTable } from "./transactions.schema.js";
import { usersTable } from "./users.schema.js";

/** Something to save or invest toward: an amount, optionally by a date and at a monthly pace. */
export const goalsTable = pgTable(
  "goals",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    kind: goalKindEnum().notNull().default("savings"),
    targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    startDate: date("start_date", { mode: "date" }).notNull(),
    targetDate: date("target_date", { mode: "date" }),
    /** The planned amount per month; null when there is no plan. */
    monthlyContribution: bigint("monthly_contribution", { mode: "number" }),
    /** Expected yearly return in basis points (700 = 7%), investment goals only. */
    expectedReturnBps: integer("expected_return_bps"),
    accountId: uuid("account_id").references(() => accountsTable.id, { onDelete: "set null" }),
    /** First day of the last month of the monthly plan; null when the plan has no end. */
    endMonth: date("end_month", { mode: "date" }),
    status: goalStatusEnum().notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("goals_household_id_idx").on(table.householdId),
    index("goals_household_status_idx").on(table.householdId, table.status),
  ],
);

/** Money put toward a goal. Negative amounts are withdrawals. Progress is the sum of these. */
export const goalContributionsTable = pgTable(
  "goal_contributions",
  {
    id: uuid().primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goalsTable.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    /**
     * What the row does: `contribution` (amount > 0), `withdrawal` (amount < 0) or `move`
     * (amount > 0, between two accounts; it never counts toward progress).
     */
    kind: varchar({ length: 16 }).notNull().default("contribution"),
    /** In the goal's currency. */
    amount: bigint({ mode: "number" }).notNull(),
    /** Where the money came from (contributions, moves) or was taken from (withdrawals). */
    fromAccountId: uuid("from_account_id").references(() => accountsTable.id, {
      onDelete: "set null",
    }),
    /** Where the money sits after a contribution or a move, or went after a withdrawal. */
    toAccountId: uuid("to_account_id").references(() => accountsTable.id, {
      onDelete: "set null",
    }),
    /** The amount actually moved when it was in another currency than the goal's. */
    originalAmount: bigint("original_amount", { mode: "number" }),
    originalCurrency: varchar("original_currency", { length: 3 }),
    /** Goal-currency units per unit of the original currency, at the time of the contribution. */
    fxRate: numeric("fx_rate", { precision: 24, scale: 10 }),
    contributedOn: date("contributed_on", { mode: "date" }).notNull(),
    note: text(),
    /** The transaction that moved the money, when there is one. It can back one contribution. */
    transactionId: uuid("transaction_id").references(() => transactionsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("goal_contributions_goal_id_idx").on(table.goalId),
    uniqueIndex("goal_contributions_transaction_unique")
      .on(table.transactionId)
      .where(sql`${table.transactionId} is not null`),
  ],
);
