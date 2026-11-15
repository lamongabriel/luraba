import {
  bigint,
  boolean,
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
import { creditCardBillingCyclesTable } from "./credit-card-billing-cycles.schema.js";
import { creditCardInstallmentsTable } from "./credit-card-installments.schema.js";
import { creditCardPurchasesTable } from "./credit-card-purchases.schema.js";
import { creditCardsTable } from "./credit-cards.schema.js";
import { householdsTable } from "./households.schema.js";
import { usersTable } from "./users.schema.js";

/** One applied issuer statement for one invoice of a card. Previews write nothing. */
export const cardStatementImportsTable = pgTable(
  "card_statement_imports",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    creditCardId: uuid("credit_card_id")
      .notNull()
      .references(() => creditCardsTable.id, { onDelete: "cascade" }),
    billingCycleId: uuid("billing_cycle_id")
      .notNull()
      .references(() => creditCardBillingCyclesTable.id, { onDelete: "cascade" }),
    issuer: varchar({ length: 32 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    /** The invoice total the issuer printed, in minor units. */
    issuerTotal: bigint("issuer_total", { mode: "number" }).notNull(),
    matchedCount: integer("matched_count").notNull().default(0),
    correctedCount: integer("corrected_count").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    missingCount: integer("missing_count").notNull().default(0),
    extraCount: integer("extra_count").notNull().default(0),
    /** True when the invoice total equalled the issuer total after the corrections. */
    reconciled: boolean().notNull().default(false),
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("card_statement_imports_card_idx").on(table.creditCardId, table.createdAt),
    index("card_statement_imports_cycle_idx").on(table.billingCycleId),
  ],
);

/** Each line of an applied statement and what happened to it. No household column: reached through the import. */
export const cardStatementLinesTable = pgTable(
  "card_statement_lines",
  {
    id: uuid().primaryKey().defaultRandom(),
    importId: uuid("import_id")
      .notNull()
      .references(() => cardStatementImportsTable.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    lineDate: date("line_date", { mode: "string" }),
    description: text().notNull(),
    amount: bigint({ mode: "number" }).notNull(),
    kind: varchar({ length: 16 }).notNull(),
    installmentNumber: integer("installment_number"),
    installmentTotal: integer("installment_total"),
    /** matched | corrected | review | missing | netted | payment */
    status: varchar({ length: 16 }).notNull(),
    installmentId: uuid("installment_id").references(() => creditCardInstallmentsTable.id, {
      onDelete: "set null",
    }),
    /** Statement amount minus Luraba's amount, for matched lines. */
    difference: bigint({ mode: "number" }),
  },
  (table) => [index("card_statement_lines_import_idx").on(table.importId, table.position)],
);

/** Every change to an installment amount that came from a statement, an override or a manual edit. */
export const cardInstallmentAuditsTable = pgTable(
  "card_installment_audits",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    creditCardId: uuid("credit_card_id")
      .notNull()
      .references(() => creditCardsTable.id, { onDelete: "cascade" }),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => creditCardPurchasesTable.id, { onDelete: "cascade" }),
    installmentId: uuid("installment_id").references(() => creditCardInstallmentsTable.id, {
      onDelete: "set null",
    }),
    billingCycleId: uuid("billing_cycle_id").references(() => creditCardBillingCyclesTable.id, {
      onDelete: "set null",
    }),
    installmentNumber: integer("installment_number").notNull(),
    previousAmount: bigint("previous_amount", { mode: "number" }).notNull(),
    newAmount: bigint("new_amount", { mode: "number" }).notNull(),
    /** statement | override | manual */
    source: varchar({ length: 16 }).notNull(),
    statementImportId: uuid("statement_import_id").references(() => cardStatementImportsTable.id, {
      onDelete: "set null",
    }),
    /** Readable summary written when the row was made, e.g. "Wiper blades inst 1: 105.10 -> 105.11, from Nubank 2026-10 statement". */
    note: text().notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("card_installment_audits_purchase_idx").on(table.purchaseId, table.createdAt),
    index("card_installment_audits_cycle_idx").on(table.billingCycleId, table.createdAt),
    index("card_installment_audits_card_idx").on(table.creditCardId, table.createdAt),
  ],
);

/**
 * How a card (merchant_key = '') or a merchant on that card (merchant_key = the merchant id) places the leftover cents,
 * learned from reconciled purchases. Rebuilt whenever an invoice is reconciled.
 */
export const cardRoundingPatternsTable = pgTable(
  "card_rounding_patterns",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    creditCardId: uuid("credit_card_id")
      .notNull()
      .references(() => creditCardsTable.id, { onDelete: "cascade" }),
    merchantKey: varchar("merchant_key", { length: 36 }).notNull().default(""),
    /** first | last | middle | none */
    pattern: varchar({ length: 16 }).notNull(),
    /** The roundingMode new purchases get; null when the pattern cannot be reproduced (middle). */
    roundingMode: varchar("rounding_mode", { length: 24 }),
    samples: integer().notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("card_rounding_patterns_scope_unique").on(table.creditCardId, table.merchantKey),
    index("card_rounding_patterns_household_idx").on(table.householdId),
  ],
);
