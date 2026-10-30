import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
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
import { householdsTable } from "./households.schema.js";
import { transactionsTable } from "./transactions.schema.js";
import { usersTable } from "./users.schema.js";

/**
 * Investments. Quantities are NUMERIC(38,18), prices NUMERIC(38,12), rates NUMERIC(24,12): never
 * floats. Enumerated columns (asset class, event type, indexer...) are varchars validated by the
 * contracts package so adding a value never needs a migration.
 */

export const investmentSettingsTable = pgTable("investment_settings", {
  householdId: uuid("household_id")
    .primaryKey()
    .references(() => householdsTable.id, { onDelete: "cascade" }),
  /** Global reporting currency for investment totals (switchable BRL/USD/EUR...). */
  reportingCurrencyId: varchar("reporting_currency_id", { length: 3 })
    .notNull()
    .default("BRL")
    .references(() => currenciesTable.code, { onDelete: "restrict" }),
  defaultCostBasisMethod: varchar("default_cost_basis_method", { length: 16 })
    .notNull()
    .default("AVERAGE"),
  defaultTaxProfile: varchar("default_tax_profile", { length: 24 })
    .notNull()
    .default("BR_INDIVIDUAL"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const investmentPortfoliosTable = pgTable(
  "investment_portfolios",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(),
    reportingCurrencyId: varchar("reporting_currency_id", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("investment_portfolios_household_name_unique").on(table.householdId, table.name),
  ],
);

/** Investment-specific settings of an account of type `investment` (one row per account). */
export const investmentAccountSettingsTable = pgTable("investment_account_settings", {
  accountId: uuid("account_id")
    .primaryKey()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  portfolioId: uuid("portfolio_id").references(() => investmentPortfoliosTable.id, {
    onDelete: "set null",
  }),
  broker: varchar({ length: 255 }),
  country: varchar({ length: 2 }).notNull().default("BR"),
  costBasisMethod: varchar("cost_basis_method", { length: 16 }).notNull().default("AVERAGE"),
  taxProfile: varchar("tax_profile", { length: 24 }).notNull().default("BR_INDIVIDUAL"),
  autoCreditIncome: boolean("auto_credit_income").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Global catalog (household_id null) plus a household's custom assets. Because a row may be
 * global, this table does not use HouseholdScopedRepository.
 */
export const assetsTable = pgTable(
  "assets",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id").references(() => householdsTable.id, { onDelete: "cascade" }),
    symbol: varchar({ length: 64 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    assetClass: varchar("asset_class", { length: 32 }).notNull(),
    exchange: varchar({ length: 32 }),
    country: varchar({ length: 2 }),
    currencyId: varchar("currency_id", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    isin: varchar({ length: 12 }),
    sector: varchar({ length: 128 }),
    industry: varchar({ length: 128 }),
    logoUrl: varchar("logo_url", { length: 512 }),
    isCustom: boolean("is_custom").notNull().default(false),
    metadata: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("assets_global_symbol_unique")
      .on(table.symbol, sql`coalesce(${table.exchange}, '')`)
      .where(sql`${table.householdId} is null`),
    uniqueIndex("assets_household_symbol_unique")
      .on(table.householdId, table.symbol, sql`coalesce(${table.exchange}, '')`)
      .where(sql`${table.householdId} is not null`),
    index("assets_class_idx").on(table.assetClass),
  ],
);

export const assetProviderSymbolsTable = pgTable(
  "asset_provider_symbols",
  {
    id: uuid().primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assetsTable.id, { onDelete: "cascade" }),
    provider: varchar({ length: 32 }).notNull(),
    providerSymbol: varchar("provider_symbol", { length: 128 }).notNull(),
  },
  (table) => [uniqueIndex("asset_provider_symbols_unique").on(table.assetId, table.provider)],
);

export const assetFixedIncomeTermsTable = pgTable("asset_fixed_income_terms", {
  assetId: uuid("asset_id")
    .primaryKey()
    .references(() => assetsTable.id, { onDelete: "cascade" }),
  issuer: varchar({ length: 255 }),
  issueDate: date("issue_date"),
  maturityDate: date("maturity_date"),
  principal: numeric({ precision: 38, scale: 12 }),
  indexer: varchar({ length: 16 }).notNull(),
  rateForm: varchar("rate_form", { length: 24 }).notNull(),
  rate: numeric({ precision: 24, scale: 12 }).notNull(),
  couponSchedule: jsonb("coupon_schedule").$type<{ date: string; rate?: string }[]>(),
  liquidity: varchar({ length: 32 }),
  fgcCovered: boolean("fgc_covered").notNull().default(false),
  dayCount: varchar("day_count", { length: 16 }).notNull().default("BUS_252"),
  /** Tesouro Direto security name used to match the Tesouro Transparente price files. */
  tesouroTitle: varchar("tesouro_title", { length: 128 }),
});

/** Household-level overrides of an asset's sector/industry plus free tags. */
export const householdAssetSettingsTable = pgTable(
  "household_asset_settings",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assetsTable.id, { onDelete: "cascade" }),
    sector: varchar({ length: 128 }),
    industry: varchar({ length: 128 }),
    tags: jsonb().$type<string[]>().notNull().default([]),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.assetId] })],
);

/** The single source of truth. Positions and P&L are recomputed from these rows. */
export const investmentEventsTable = pgTable(
  "investment_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id").references(() => assetsTable.id, { onDelete: "restrict" }),
    type: varchar({ length: 32 }).notNull(),
    tradeDate: date("trade_date").notNull(),
    settlementDate: date("settlement_date"),
    quantity: numeric({ precision: 38, scale: 18 }),
    unitPrice: numeric("unit_price", { precision: 38, scale: 12 }),
    grossAmount: numeric("gross_amount", { precision: 38, scale: 12 }).notNull().default("0"),
    fees: numeric({ precision: 38, scale: 12 }).notNull().default("0"),
    taxesWithheld: numeric("taxes_withheld", { precision: 38, scale: 12 }).notNull().default("0"),
    netAmount: numeric("net_amount", { precision: 38, scale: 12 }).notNull().default("0"),
    currencyId: varchar("currency_id", { length: 3 })
      .notNull()
      .references(() => currenciesTable.code, { onDelete: "restrict" }),
    fxRateToAccountBase: numeric("fx_rate_to_account_base", { precision: 24, scale: 12 }),
    notes: text(),
    /** `manual`, `system`, or `import:<format>`. */
    source: varchar({ length: 48 }).notNull().default("manual"),
    externalId: varchar("external_id", { length: 255 }),
    /** Hash of date + asset + type + quantity + price, to flag duplicates across imports. */
    dedupHash: varchar("dedup_hash", { length: 64 }),
    relatedEventId: uuid("related_event_id"),
    /** The cash transfer transaction behind a deposit/withdrawal/transfer. */
    transactionId: uuid("transaction_id").references(() => transactionsTable.id, {
      onDelete: "set null",
    }),
    meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("investment_events_account_date_idx").on(table.accountId, table.tradeDate),
    index("investment_events_asset_idx").on(table.assetId),
    index("investment_events_household_date_idx").on(table.householdId, table.tradeDate),
    index("investment_events_dedup_idx").on(table.accountId, table.dedupHash),
    uniqueIndex("investment_events_external_id_unique")
      .on(table.accountId, table.externalId)
      .where(sql`${table.externalId} is not null`),
  ],
);

export const priceHistoryTable = pgTable(
  "price_history",
  {
    id: uuid().primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assetsTable.id, { onDelete: "cascade" }),
    priceDate: date("price_date").notNull(),
    open: numeric({ precision: 38, scale: 12 }),
    high: numeric({ precision: 38, scale: 12 }),
    low: numeric({ precision: 38, scale: 12 }),
    close: numeric({ precision: 38, scale: 12 }).notNull(),
    adjClose: numeric("adj_close", { precision: 38, scale: 12 }),
    volume: numeric({ precision: 38, scale: 4 }),
    /** Provider id, or `manual` (a manual price wins over provider prices for the same day). */
    source: varchar({ length: 32 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("price_history_asset_date_source_unique").on(
      table.assetId,
      table.priceDate,
      table.source,
    ),
  ],
);

export const assetQuotesTable = pgTable("asset_quotes", {
  assetId: uuid("asset_id")
    .primaryKey()
    .references(() => assetsTable.id, { onDelete: "cascade" }),
  price: numeric({ precision: 38, scale: 12 }).notNull(),
  change: numeric({ precision: 38, scale: 12 }),
  changePercent: numeric("change_percent", { precision: 24, scale: 10 }),
  currencyId: varchar("currency_id", { length: 3 }).notNull(),
  asOf: timestamp("as_of").notNull(),
  provider: varchar({ length: 32 }).notNull(),
  isDelayed: boolean("is_delayed").notNull().default(true),
  isManual: boolean("is_manual").notNull().default(false),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
});

/** Macro series: CDI_DAILY, SELIC_DAILY, SELIC_TARGET, IPCA_MONTHLY, IGPM_MONTHLY, US_CPI_MONTHLY, benchmarks. */
export const macroIndexValuesTable = pgTable(
  "macro_index_values",
  {
    series: varchar({ length: 32 }).notNull(),
    refDate: date("ref_date").notNull(),
    value: numeric({ precision: 38, scale: 12 }).notNull(),
    source: varchar({ length: 32 }).notNull(),
    isEstimate: boolean("is_estimate").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.series, table.refDate] })],
);

export const taxRulesTable = pgTable(
  "tax_rules",
  {
    id: uuid().primaryKey().defaultRandom(),
    country: varchar({ length: 2 }).notNull(),
    ruleKey: varchar("rule_key", { length: 64 }).notNull(),
    assetClass: varchar("asset_class", { length: 32 }),
    eventType: varchar("event_type", { length: 32 }),
    rate: numeric({ precision: 24, scale: 12 }),
    minDays: integer("min_days"),
    maxDays: integer("max_days"),
    threshold: numeric({ precision: 38, scale: 12 }),
    params: jsonb().$type<Record<string, unknown>>(),
    effectiveFrom: date("effective_from").notNull(),
    effectiveTo: date("effective_to"),
    notes: text(),
  },
  (table) => [index("tax_rules_key_idx").on(table.ruleKey, table.effectiveFrom)],
);

export const holidayCalendarTable = pgTable(
  "holiday_calendar",
  {
    calendar: varchar({ length: 16 }).notNull(),
    holidayDate: date("holiday_date").notNull(),
    name: varchar({ length: 128 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.calendar, table.holidayDate] })],
);

export const allocationTargetsTable = pgTable(
  "allocation_targets",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    portfolioId: uuid("portfolio_id")
      .notNull()
      .references(() => investmentPortfoliosTable.id, { onDelete: "cascade" }),
    dimension: varchar({ length: 16 }).notNull(),
    key: varchar({ length: 128 }).notNull(),
    targetPercent: numeric("target_percent", { precision: 9, scale: 4 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("allocation_targets_unique").on(table.portfolioId, table.dimension, table.key),
  ],
);

export const marketDataProviderSettingsTable = pgTable(
  "market_data_provider_settings",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    providerId: varchar("provider_id", { length: 32 }).notNull(),
    enabled: boolean().notNull().default(true),
    /** Lower runs first; null keeps the configured default order. */
    priority: integer(),
    /** AES-GCM encrypted with INTEGRATIONS_ENCRYPTION_KEY. */
    apiKeyEncrypted: text("api_key_encrypted"),
    premium: boolean().notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_data_provider_settings_unique").on(table.householdId, table.providerId),
  ],
);

/** Rebuildable daily value cache per account, in the account base currency. */
export const portfolioSnapshotsTable = pgTable(
  "portfolio_snapshots",
  {
    accountId: uuid("account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    value: numeric({ precision: 38, scale: 12 }).notNull(),
    invested: numeric({ precision: 38, scale: 12 }).notNull(),
    cash: numeric({ precision: 38, scale: 12 }).notNull(),
    /** Net external contribution of the day (deposits - withdrawals). */
    flow: numeric({ precision: 38, scale: 12 }).notNull().default("0"),
  },
  (table) => [primaryKey({ columns: [table.accountId, table.snapshotDate] })],
);

/** Records the DARF the user paid for a month and bucket (creates a TAX_PAYMENT event). */
export const darfPaymentsTable = pgTable(
  "darf_payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    month: varchar({ length: 7 }).notNull(),
    bucket: varchar({ length: 16 }).notNull(),
    amount: numeric({ precision: 38, scale: 12 }).notNull(),
    paidDate: date("paid_date").notNull(),
    eventId: uuid("event_id").references(() => investmentEventsTable.id, { onDelete: "set null" }),
  },
  (table) => [uniqueIndex("darf_payments_unique").on(table.accountId, table.month, table.bucket)],
);

/** A previewed statement import: parsed rows are staged here until the user commits them. */
export const investmentImportBatchesTable = pgTable(
  "investment_import_batches",
  {
    id: uuid().primaryKey().defaultRandom(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    format: varchar({ length: 32 }).notNull(),
    fileName: varchar("file_name", { length: 255 }),
    status: varchar({ length: 16 }).notNull().default("previewed"),
    rows: jsonb().$type<unknown[]>().notNull().default([]),
    summary: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdByUserId: uuid("created_by_user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("investment_import_batches_household_idx").on(table.householdId, table.createdAt),
  ],
);

/** Saved column mappings for generic CSV imports. */
export const investmentImportMappingsTable = pgTable(
  "investment_import_mappings",
  {
    householdId: uuid("household_id")
      .notNull()
      .references(() => householdsTable.id, { onDelete: "cascade" }),
    name: varchar({ length: 128 }).notNull(),
    mapping: jsonb().$type<Record<string, string>>().notNull().default({}),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.householdId, table.name] })],
);
