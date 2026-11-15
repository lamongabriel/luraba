import {
  bigint,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts.schema.js";
import { currenciesTable } from "./currencies.schema.js";
import { goalsTable } from "./goals.schema.js";
import { householdsTable } from "./households.schema.js";
import { transactionsTable } from "./transactions.schema.js";
import { uploadsTable } from "./uploads.schema.js";
import { usersTable } from "./users.schema.js";

/**
 * A savings bucket inside one real account (Nubank Caixinha, Inter Porquinho). Its balance is the
 * sum of its movements; the parent account's ledger holds the real money. See docs/piggy-banks.md.
 */
export const piggyBanksTable = pgTable(
  "piggy_banks",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    parentAccountId: uuid("parent_account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "restrict" }),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    /** An uploaded cover picture; wins over the preset and the emoji. */
    coverUploadId: uuid("cover_upload_id").references(() => uploadsTable.id, {
      onDelete: "set null",
    }),
    /** A built-in cover (see `PIGGY_BANK_COVER_PRESETS` in contracts). */
    coverPreset: varchar("cover_preset", { length: 32 }),
    emoji: varchar({ length: 16 }),
    color: varchar({ length: 7 }),
    currencyCode: varchar("currency_code", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    /** `cdi_percent`, `selic_percent`, `ipca_plus`, `fixed_rate` or `none`. */
    yieldType: varchar("yield_type", { length: 16 }).notNull().default("none"),
    /** A percentage: 102 = 102% of CDI, 6.5 = IPCA + 6.5% a.a. */
    yieldRate: numeric("yield_rate", { precision: 12, scale: 6 }).notNull().default("0"),
    /** 252 business days or 365 calendar days. */
    dayCount: integer("day_count").notNull().default(365),
    maturityDate: date("maturity_date", { mode: "date" }),
    /** `daily` or `at_maturity`. */
    liquidity: varchar({ length: 16 }).notNull().default("daily"),
    /** `none` or `regressive_ir`. */
    taxRegime: varchar("tax_regime", { length: 16 }).notNull().default("none"),
    applyIof: boolean("apply_iof").notNull().default(false),
    /** The holding that stands for the account's money before it is split (migration script). */
    isUnallocated: boolean("is_unallocated").notNull().default(false),
    /** Last day accrued (inclusive); the job continues the day after. */
    accruedThrough: date("accrued_through", { mode: "date" }),
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("piggy_banks_household_id_idx").on(table.householdId),
    index("piggy_banks_parent_account_id_idx").on(table.parentAccountId),
    uniqueIndex("piggy_banks_parent_title_unique").on(table.parentAccountId, table.title),
  ],
);

/**
 * What makes the balance: signed minor units in the piggy bank's currency. Reached through a
 * piggy bank already loaded for the household (no household column of its own).
 */
export const piggyBankMovementsTable = pgTable(
  "piggy_bank_movements",
  {
    id: uuid().primaryKey().defaultRandom(),
    piggyBankId: uuid("piggy_bank_id")
      .notNull()
      .references(() => piggyBanksTable.id, { onDelete: "cascade" }),
    /** opening, deposit, withdrawal, transfer_in, transfer_out, interest or adjustment. */
    kind: varchar({ length: 16 }).notNull(),
    amount: bigint({ mode: "number" }).notNull(),
    occurredOn: date("occurred_on", { mode: "date" }).notNull(),
    /** The ledger transaction behind it (transfer, interest income or adjustment), if any. */
    transactionId: uuid("transaction_id").references(() => transactionsTable.id, {
      onDelete: "set null",
    }),
    /** Movements created together (a bulk move or a piggy-to-piggy move) share this id. */
    groupId: uuid("group_id"),
    /** The other piggy bank of a piggy-to-piggy move. */
    counterpartPiggyBankId: uuid("counterpart_piggy_bank_id").references(() => piggyBanksTable.id, {
      onDelete: "set null",
    }),
    /** Interest posted from an index projection or before the owner confirmed the real balance. */
    estimated: boolean().notNull().default(false),
    note: text(),
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("piggy_bank_movements_piggy_bank_idx").on(table.piggyBankId, table.occurredOn),
    index("piggy_bank_movements_transaction_idx").on(table.transactionId),
    index("piggy_bank_movements_group_idx").on(table.groupId),
  ],
);

/** One row per piggy bank and day: the primary key makes the daily job idempotent. */
export const piggyBankAccrualsTable = pgTable(
  "piggy_bank_accruals",
  {
    piggyBankId: uuid("piggy_bank_id")
      .notNull()
      .references(() => piggyBanksTable.id, { onDelete: "cascade" }),
    accrualDate: date("accrual_date", { mode: "date" }).notNull(),
    openingBalance: bigint("opening_balance", { mode: "number" }).notNull(),
    /** Interest before rounding, in fractional minor units. */
    exactAmount: numeric("exact_amount", { precision: 38, scale: 12 }).notNull(),
    /** What was posted (whole minor units). */
    postedAmount: bigint("posted_amount", { mode: "number" }).notNull(),
    /** The fraction carried into the next day. */
    carryOut: numeric("carry_out", { precision: 38, scale: 12 }).notNull(),
    factor: numeric({ precision: 30, scale: 16 }).notNull(),
    estimated: boolean().notNull().default(false),
    movementId: uuid("movement_id").references(() => piggyBankMovementsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.piggyBankId, table.accrualDate] })],
);

/** Which piggy banks make up a goal's progress. */
export const goalPiggyBanksTable = pgTable(
  "goal_piggy_banks",
  {
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goalsTable.id, { onDelete: "cascade" }),
    piggyBankId: uuid("piggy_bank_id")
      .notNull()
      .references(() => piggyBanksTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.goalId, table.piggyBankId] }),
    index("goal_piggy_banks_piggy_bank_idx").on(table.piggyBankId),
  ],
);
