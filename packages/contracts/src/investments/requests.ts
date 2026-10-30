import { z } from "zod";
import { currencyCodeSchema, idParamsSchema } from "../common.js";
import {
  allocationDimensionSchema,
  assetClassSchema,
  benchmarkSchema,
  costBasisMethodSchema,
  dayCountSchema,
  decimalStringSchema,
  indexerSchema,
  investmentEventTypeSchema,
  isoDateSchema,
  nonNegativeDecimalSchema,
  performancePeriodSchema,
  rateFormSchema,
  taxProfileSchema,
} from "./values.js";

const countrySchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());
const optionalUuid = z.uuid().optional();

export const investmentSettingsBodySchema = z
  .object({
    reportingCurrencyCode: currencyCodeSchema.optional(),
    defaultCostBasisMethod: costBasisMethodSchema.optional(),
    defaultTaxProfile: taxProfileSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const portfolioBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  reportingCurrencyCode: currencyCodeSchema,
});
export const updatePortfolioBodySchema = portfolioBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const createInvestmentAccountBodySchema = z.object({
  name: z.string().trim().min(1).max(255),
  broker: z.string().trim().max(255).nullable().optional(),
  country: countrySchema.default("BR"),
  /** Base currency of the account (cost and totals are tracked in it). */
  currencyCode: currencyCodeSchema,
  costBasisMethod: costBasisMethodSchema.optional(),
  taxProfile: taxProfileSchema.optional(),
  autoCreditIncome: z.boolean().default(true),
  portfolioId: z.uuid().nullable().optional(),
});
export const updateInvestmentAccountSettingsBodySchema = z
  .object({
    broker: z.string().trim().max(255).nullable().optional(),
    country: countrySchema.optional(),
    costBasisMethod: costBasisMethodSchema.optional(),
    taxProfile: taxProfileSchema.optional(),
    autoCreditIncome: z.boolean().optional(),
    portfolioId: z.uuid().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const fixedIncomeTermsBodySchema = z.object({
  issuer: z.string().trim().max(255).nullable().optional(),
  issueDate: isoDateSchema.nullable().optional(),
  maturityDate: isoDateSchema.nullable().optional(),
  principal: nonNegativeDecimalSchema.nullable().optional(),
  indexer: indexerSchema,
  rateForm: rateFormSchema,
  /** Fraction: 1.10 for 110% of CDI, 0.06 for IPCA + 6%, 0.12 for 12% fixed. */
  rate: nonNegativeDecimalSchema,
  couponSchedule: z
    .array(z.object({ date: isoDateSchema, rate: decimalStringSchema.optional() }))
    .nullable()
    .optional(),
  liquidity: z.string().trim().max(32).nullable().optional(),
  fgcCovered: z.boolean().default(false),
  dayCount: dayCountSchema.default("BUS_252"),
  tesouroTitle: z.string().trim().max(128).nullable().optional(),
});

export const createAssetBodySchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1).max(255),
  assetClass: assetClassSchema,
  exchange: z.string().trim().max(32).nullable().optional(),
  country: countrySchema.nullable().optional(),
  currencyCode: currencyCodeSchema,
  isin: z.string().trim().max(12).nullable().optional(),
  sector: z.string().trim().max(128).nullable().optional(),
  industry: z.string().trim().max(128).nullable().optional(),
  providerSymbols: z.record(z.string(), z.string().trim().min(1).max(128)).optional(),
  fixedIncome: fixedIncomeTermsBodySchema.optional(),
});
export const updateAssetBodySchema = createAssetBodySchema
  .partial()
  .extend({ tags: z.array(z.string().trim().min(1).max(64)).max(20).optional() })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const listAssetsQuerySchema = z.object({
  search: z.string().trim().max(128).optional(),
  assetClass: assetClassSchema.optional(),
  held: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export const searchAssetsQuerySchema = z.object({
  q: z.string().trim().min(1).max(128),
  /** Also query market-data providers, not just the catalog. */
  remote: z.coerce.boolean().default(true),
});
export const importAssetCandidateBodySchema = z.object({
  symbol: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(255),
  assetClass: assetClassSchema.nullable().optional(),
  exchange: z.string().trim().max(32).nullable().optional(),
  country: countrySchema.nullable().optional(),
  currencyCode: currencyCodeSchema.nullable().optional(),
  provider: z.string().trim().min(1).max(32),
  providerSymbol: z.string().trim().min(1).max(128),
});
export const manualPriceBodySchema = z.object({
  date: isoDateSchema,
  price: nonNegativeDecimalSchema,
});
export const priceOnQuerySchema = z.object({ date: isoDateSchema });
export const assetHistoryQuerySchema = z.object({
  range: z.enum(["5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"]).default("1Y"),
  accountId: optionalUuid,
});

export const eventMetaSchema = z
  .object({
    ratioFrom: nonNegativeDecimalSchema.optional(),
    ratioTo: nonNegativeDecimalSchema.optional(),
    targetAssetId: z.uuid().optional(),
    costRatio: nonNegativeDecimalSchema.optional(),
    exchangeRatio: nonNegativeDecimalSchema.optional(),
    toCurrency: currencyCodeSchema.optional(),
    toAmount: nonNegativeDecimalSchema.optional(),
    lots: z.array(z.object({ lotId: z.string(), quantity: nonNegativeDecimalSchema })).optional(),
    counterpartAccountId: z.uuid().optional(),
    skipCash: z.boolean().optional(),
    paidMonth: z
      .string()
      .regex(/^\d{4}-\d{2}$/u)
      .optional(),
    bucket: z.string().max(16).optional(),
  })
  .catchall(z.unknown());

export const eventBodySchema = z.object({
  accountId: z.uuid(),
  assetId: z.uuid().nullable().optional(),
  type: investmentEventTypeSchema,
  tradeDate: isoDateSchema,
  settlementDate: isoDateSchema.nullable().optional(),
  quantity: nonNegativeDecimalSchema.nullable().optional(),
  unitPrice: nonNegativeDecimalSchema.nullable().optional(),
  /** Omit to derive it from quantity x unit price. */
  grossAmount: nonNegativeDecimalSchema.optional(),
  fees: nonNegativeDecimalSchema.default("0"),
  /** Omit to let the tax rules estimate the withholding (JCP, US non-resident dividends). */
  taxesWithheld: nonNegativeDecimalSchema.optional(),
  /** Defaults to the asset currency, or the account currency for cash events. */
  currencyCode: currencyCodeSchema.optional(),
  /** Omit to use the FX module's rate for the trade date. */
  fxRateToAccountBase: nonNegativeDecimalSchema.nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  meta: eventMetaSchema.optional(),
});
export const updateEventBodySchema = eventBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

export const listEventsQuerySchema = z.object({
  accountId: optionalUuid,
  assetId: optionalUuid,
  portfolioId: optionalUuid,
  type: investmentEventTypeSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(500).default(50),
});

export const cashMovementBodySchema = z.object({
  kind: z.enum([
    "deposit",
    "withdrawal",
    "transfer_in",
    "transfer_out",
    "fx_conversion",
    "interest",
    "fee",
  ]),
  date: isoDateSchema,
  amount: nonNegativeDecimalSchema,
  currencyCode: currencyCodeSchema,
  /** The other account of a transfer (checking, savings...). Creates a real transfer transaction. */
  counterpartAccountId: z.uuid().optional(),
  toCurrencyCode: currencyCodeSchema.optional(),
  toAmount: nonNegativeDecimalSchema.optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const scopeQuerySchema = z.object({
  portfolioId: optionalUuid,
  accountId: optionalUuid,
  /** Reporting currency override; defaults to the portfolio's or the household setting. */
  currencyCode: currencyCodeSchema.optional(),
  /** Show values net of estimated taxes. */
  net: z.coerce.boolean().default(false),
});
export const dashboardQuerySchema = scopeQuerySchema.extend({
  period: performancePeriodSchema.default("1Y"),
  benchmark: benchmarkSchema.optional(),
});
export const allocationQuerySchema = scopeQuerySchema.extend({
  dimension: allocationDimensionSchema.default("class"),
});
export const rebalanceQuerySchema = z.object({
  portfolioId: z.uuid(),
  dimension: allocationDimensionSchema.default("class"),
  /** Amount to invest, in the reporting currency. */
  contribution: nonNegativeDecimalSchema,
});
export const allocationTargetsBodySchema = z.object({
  dimension: allocationDimensionSchema,
  targets: z.array(
    z.object({ key: z.string().trim().min(1).max(128), percent: nonNegativeDecimalSchema }),
  ),
});

export const incomeQuerySchema = scopeQuerySchema.extend({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});
export const taxYearQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  accountId: optionalUuid,
});
export const markDarfPaidBodySchema = z.object({
  accountId: z.uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/u),
  bucket: z.enum(["COMMON_SWING", "FII_SWING", "DAY_TRADE"]),
  amount: nonNegativeDecimalSchema,
  paidDate: isoDateSchema,
});
export const corporateActionsQuerySchema = z.object({
  accountId: optionalUuid,
  assetId: optionalUuid,
  from: isoDateSchema.optional(),
});
export const holdingsAtQuerySchema = z.object({ date: isoDateSchema, accountId: optionalUuid });

export const providerSettingsBodySchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(100).nullable().optional(),
  premium: z.boolean().optional(),
  /** Empty string clears the stored key. */
  apiKey: z.string().max(256).optional(),
});
export const providerParamsSchema = z.object({ providerId: z.string().trim().min(1).max(32) });

export const importFormatSchema = z.enum([
  "app_csv",
  "b3_negociacao",
  "b3_movimentacao",
  "generic_csv",
  "json_backup",
]);
export const importPreviewBodySchema = z.object({
  accountId: z.uuid(),
  format: importFormatSchema,
  fileName: z.string().trim().max(255).optional(),
  /** File text (CSV/JSON) or base64 for spreadsheets. */
  content: z.string().max(25_000_000),
  encoding: z.enum(["text", "base64"]).default("text"),
  broker: z.string().trim().max(128).optional(),
  /** generic_csv: logical field -> column header. */
  mapping: z.record(z.string(), z.string()).optional(),
  saveMapping: z.boolean().default(false),
});
export const batchParamsSchema = z.object({ batchId: z.uuid() });
export const importCommitBodySchema = z.object({
  /** Row numbers to skip (duplicates the user does not want, errors). Duplicates are skipped by default. */
  skipRows: z.array(z.number().int()).default([]),
  includeDuplicates: z.boolean().default(false),
});
export const exportKindParamsSchema = z.object({
  kind: z.enum(["events", "positions", "income", "realized", "tax", "backup"]),
});
export const investmentExportQuerySchema = z.object({
  format: z.enum(["csv", "json"]).default("csv"),
  accountId: optionalUuid,
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
export const refreshBodySchema = z.object({ accountId: optionalUuid, assetId: optionalUuid });

export { idParamsSchema };
export type CreateInvestmentAccountInput = z.input<typeof createInvestmentAccountBodySchema>;
export type InvestmentExportKind = z.output<typeof exportKindParamsSchema>["kind"];
export type EventBodyInput = z.input<typeof eventBodySchema>;
export type CashMovementInput = z.input<typeof cashMovementBodySchema>;
export type CreateAssetInput = z.input<typeof createAssetBodySchema>;
export type FixedIncomeTermsInput = z.input<typeof fixedIncomeTermsBodySchema>;
export type ImportPreviewInput = z.input<typeof importPreviewBodySchema>;
