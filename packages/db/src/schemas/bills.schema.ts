import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories.schema.js";
import { currenciesTable } from "./currencies.schema.js";
import { billAudienceEnum, billFrequencyEnum, billStatusEnum } from "./enums.schema.js";
import { householdsTable } from "./households.schema.js";
import { merchantsTable } from "./merchants.schema.js";
import { transactionsTable } from "./transactions.schema.js";
import { usersTable } from "./users.schema.js";

/** A payment that repeats on a schedule: a utility, rent, or a fixed-length loan. */
export const billsTable = pgTable(
  "bills",
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
    expectedAmount: bigint("expected_amount", { mode: "number" }).notNull(),
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    frequency: billFrequencyEnum().notNull(),
    dayOfMonth: integer("day_of_month"),
    dayOfWeek: integer("day_of_week"),
    startDate: date("start_date", { mode: "date" }).notNull(),
    endDate: date("end_date", { mode: "date" }),
    /** Total payments of a finite plan; null for open-ended bills. */
    installmentCount: integer("installment_count"),
    status: billStatusEnum().notNull().default("active"),
    categoryId: uuid("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    merchantId: uuid("merchant_id").references(() => merchantsTable.id, { onDelete: "set null" }),
    remindDaysBefore: integer("remind_days_before"),
    audience: billAudienceEnum().notNull().default("owner"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("bills_household_id_idx").on(table.householdId),
    index("bills_household_status_idx").on(table.householdId, table.status),
  ],
);

/**
 * One due date of a bill. Unpaid and unskipped means scheduled (overdue once the
 * date passes); the state is derived, never stored.
 */
export const billOccurrencesTable = pgTable(
  "bill_occurrences",
  {
    id: uuid().primaryKey().defaultRandom(),
    billId: uuid("bill_id")
      .notNull()
      .references(() => billsTable.id, { onDelete: "cascade" }),
    dueDate: date("due_date", { mode: "date" }).notNull(),
    installmentNumber: integer("installment_number"),
    expectedAmount: bigint("expected_amount", { mode: "number" }).notNull(),
    /** Set when paid, either by linking a transaction or by marking it paid by hand. */
    paidAt: timestamp("paid_at"),
    skippedAt: timestamp("skipped_at"),
    transactionId: uuid("transaction_id").references(() => transactionsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("bill_occurrences_bill_due_date_unique").on(table.billId, table.dueDate),
    uniqueIndex("bill_occurrences_transaction_unique")
      .on(table.transactionId)
      .where(sql`${table.transactionId} is not null`),
    index("bill_occurrences_due_date_idx").on(table.dueDate),
  ],
);
