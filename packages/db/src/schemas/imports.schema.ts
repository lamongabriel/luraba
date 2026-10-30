import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts.schema.js";
import { categoriesTable } from "./categories.schema.js";
import { creditCardsTable } from "./credit-cards.schema.js";
import { householdsTable } from "./households.schema.js";
import { merchantsTable } from "./merchants.schema.js";
import { usersTable } from "./users.schema.js";

/** One uploaded statement: what was detected in the file, the chosen target and the run outcome. */
export const importBatchesTable = pgTable(
  "import_batches",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "restrict" }),
    /** `draft` (mapping), `queued`, `importing`, `completed`, `failed`. */
    status: varchar({ length: 16 }).notNull().default("draft"),
    parserId: varchar("parser_id", { length: 64 }).notNull(),
    /** `table` (CSV/Excel: the user maps columns) or `statement` (OFX: fixed fields). */
    format: varchar({ length: 16 }).notNull().default("statement"),
    /** The file as plain text cells (header row + data rows), kept so the column mapping can be re-applied. */
    rawTable: jsonb("raw_table").$type<{ headers: string[]; rows: string[][] } | null>(),
    /** The column mapping last applied to `rawTable`; null until the user confirms step 2. */
    columnMapping: jsonb("column_mapping").$type<Record<string, unknown> | null>(),
    /** `bank_account` or `credit_card`: what the file describes. */
    sourceKind: varchar("source_kind", { length: 16 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileHash: varchar("file_hash", { length: 64 }).notNull(),
    fileSize: integer("file_size").notNull(),
    institution: varchar({ length: 255 }),
    /** The account/card identifier written in the file, shown to help picking the target. */
    sourceAccountRef: varchar("source_account_ref", { length: 255 }),
    currencyCode: varchar("currency_code", { length: 3 }),
    periodStart: date("period_start", { mode: "date" }),
    periodEnd: date("period_end", { mode: "date" }),
    /** Closing balance printed in the file, minor units, in the account's own sign convention. */
    statementBalance: bigint("statement_balance", { mode: "number" }),
    statementBalanceDate: date("statement_balance_date", { mode: "date" }),
    warnings: jsonb().$type<string[]>().notNull().default([]),
    targetAccountId: uuid("target_account_id").references(() => accountsTable.id, {
      onDelete: "set null",
    }),
    targetCreditCardId: uuid("target_credit_card_id").references(() => creditCardsTable.id, {
      onDelete: "set null",
    }),
    rowCount: integer("row_count").notNull().default(0),
    processedCount: integer("processed_count").notNull().default(0),
    createdCount: integer("created_count").notNull().default(0),
    duplicateCount: integer("duplicate_count").notNull().default(0),
    skippedCount: integer("skipped_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at"),
    finishedAt: timestamp("finished_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("import_batches_household_idx").on(table.householdId, table.createdAt),
    index("import_batches_file_hash_idx").on(table.householdId, table.fileHash),
  ],
);

/** A staged row: the parsed values, the user's decisions and, after the run, the outcome. */
export const importRowsTable = pgTable(
  "import_rows",
  {
    id: uuid().primaryKey().defaultRandom(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatchesTable.id, { onDelete: "cascade" }),
    rowIndex: integer("row_index").notNull(),
    postedDate: date("posted_date", { mode: "date" }),
    /** Signed minor units from the account's point of view: negative = money out / card charge. */
    amount: bigint({ mode: "number" }),
    description: text().notNull(),
    counterparty: text(),
    /** Normalized key used to remember mappings (`import_mappings.source_key`). */
    sourceKey: text("source_key").notNull(),
    /** The bank's id when it has one; made unique inside the file. */
    externalId: text("external_id"),
    /** date|amount|description based key; the fallback for dedupe. */
    fingerprint: text(),
    /** Identifies one installment plan across monthly statements. */
    seriesKey: text("series_key"),
    installmentNumber: integer("installment_number"),
    installmentTotal: integer("installment_total"),
    balanceAfter: bigint("balance_after", { mode: "number" }),
    hints: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    raw: jsonb().$type<Record<string, string>>().notNull().default({}),
    /** Row level overrides; null falls back to the mapping of `source_key`. */
    merchantId: uuid("merchant_id").references(() => merchantsTable.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    tagIds: jsonb("tag_ids").$type<string[] | null>(),
    descriptionOverride: varchar("description_override", { length: 512 }),
    skip: boolean().notNull().default(false),
    /** Resolved kind: expense, income, transfer, card_purchase, card_payment or unsupported. */
    kind: varchar({ length: 24 }),
    issues: jsonb()
      .$type<Array<{ code: string; severity: "error" | "warning" | "info"; message: string }>>()
      .notNull()
      .default([]),
    /** `created`, `duplicate`, `skipped` or `failed` once the run reached the row. */
    outcome: varchar({ length: 16 }),
    outcomeMessage: text("outcome_message"),
    createdTransactionId: uuid("created_transaction_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("import_rows_batch_index_unique").on(table.batchId, table.rowIndex),
    index("import_rows_batch_outcome_idx").on(table.batchId, table.outcome),
  ],
);

/** Remembered answers per household: "this bank name is that merchant/account/card". */
export const importMappingsTable = pgTable(
  "import_mappings",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    displayName: text("display_name").notNull(),
    /** `merchant`, `account`, `credit_card` or `none`. */
    targetType: varchar("target_type", { length: 16 }).notNull().default("none"),
    merchantId: uuid("merchant_id").references(() => merchantsTable.id, { onDelete: "set null" }),
    accountId: uuid("account_id").references(() => accountsTable.id, { onDelete: "set null" }),
    creditCardId: uuid("credit_card_id").references(() => creditCardsTable.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    tagIds: jsonb("tag_ids").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("import_mappings_household_key_unique").on(table.householdId, table.sourceKey),
  ],
);

/**
 * The idempotency ledger: one row per statement row that became (or matched) a Luraba record.
 * A re-import finds its rows here instead of creating them again.
 */
export const importRecordsTable = pgTable(
  "import_records",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => importBatchesTable.id, { onDelete: "set null" }),
    /** `account` or `credit_card`: what the statement was imported into. */
    targetType: varchar("target_type", { length: 16 }).notNull(),
    targetId: uuid("target_id").notNull(),
    externalId: text("external_id"),
    fingerprint: text(),
    seriesKey: text("series_key"),
    /** The description exactly as the file wrote it, so a created transaction can be traced back. */
    originalName: text("original_name"),
    installmentNumber: integer("installment_number"),
    installmentTotal: integer("installment_total"),
    /** Same-money movement seen from two statements (transfers, card payments). */
    pairKey: text("pair_key"),
    transactionId: uuid("transaction_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("import_records_target_idx").on(table.householdId, table.targetType, table.targetId),
    uniqueIndex("import_records_external_unique")
      .on(table.householdId, table.targetType, table.targetId, table.externalId)
      .where(sql`${table.externalId} is not null`),
    uniqueIndex("import_records_pair_unique")
      .on(table.householdId, table.pairKey)
      .where(sql`${table.pairKey} is not null`),
    index("import_records_series_idx").on(table.householdId, table.targetId, table.seriesKey),
    index("import_records_fingerprint_idx").on(
      table.householdId,
      table.targetId,
      table.fingerprint,
    ),
  ],
);

/** A saved column mapping per account or card: the next file with the same layout arrives mapped. */
export const importTemplatesTable = pgTable(
  "import_templates",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    /** `account` or `credit_card`. */
    targetType: varchar("target_type", { length: 16 }).notNull(),
    targetId: uuid("target_id").notNull(),
    /** Normalized header names joined together: a template applies when the file has the same layout. */
    headerSignature: text("header_signature").notNull(),
    mapping: jsonb().$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("import_templates_target_unique").on(
      table.householdId,
      table.targetType,
      table.targetId,
    ),
  ],
);
