import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { currenciesTable } from "./currencies.schema.js";
import { splitStatusEnum } from "./enums.schema.js";
import { householdsTable } from "./households.schema.js";
import { transactionsTable } from "./transactions.schema.js";
import { usersTable } from "./users.schema.js";

/** A purchase shared with other people who pay their part back over time. */
export const splitsTable = pgTable(
  "splits",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    totalAmount: bigint("total_amount", { mode: "number" }),
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    status: splitStatusEnum().notNull().default("active"),
    sourceTransactionId: uuid("source_transaction_id").references(() => transactionsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("splits_household_id_idx").on(table.householdId)],
);

export const splitParticipantsTable = pgTable(
  "split_participants",
  {
    id: uuid().primaryKey().defaultRandom(),
    splitId: uuid("split_id")
      .notNull()
      .references(() => splitsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 120 }).notNull(),
    notes: text(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("split_participants_split_id_idx").on(table.splitId)],
);

/**
 * One payment a person is expected to make. Unresolved means scheduled (overdue
 * once the due date and grace period pass); the state is derived, never stored.
 */
export const splitInstallmentsTable = pgTable(
  "split_installments",
  {
    id: uuid().primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => splitParticipantsTable.id, { onDelete: "cascade" }),
    dueDate: date("due_date", { mode: "date" }).notNull(),
    graceUntil: date("grace_until", { mode: "date" }),
    expectedAmount: bigint("expected_amount", { mode: "number" }).notNull(),
    receivedAt: timestamp("received_at"),
    skippedAt: timestamp("skipped_at"),
    writtenOffAt: timestamp("written_off_at"),
    transactionId: uuid("transaction_id").references(() => transactionsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("split_installments_participant_id_idx").on(table.participantId),
    uniqueIndex("split_installments_transaction_unique")
      .on(table.transactionId)
      .where(sql`${table.transactionId} is not null`),
  ],
);
