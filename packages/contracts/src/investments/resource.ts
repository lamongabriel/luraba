import { z } from "zod";
import {
  createdByUserIdSchema,
  currencyCodeSchema,
  moneyBalanceSchema,
  wireDateTimeSchema,
} from "../common.js";
import {
  allocationDimensionSchema,
  assetClassSchema,
  costBasisMethodSchema,
  dayCountSchema,
  indexerSchema,
  investmentEventTypeSchema,
  rateFormSchema,
  taxProfileSchema,
} from "./values.js";

/** Aggregated amounts are integer minor units of the stated currency; prices/quantities/rates are decimal strings. */
const money = moneyBalanceSchema;
const decimal = z.string();
const nullableDecimal = z.string().nullable();
const isoDate = z.string();

export const investmentSettingsSchema = z.object({
  reportingCurrencyCode: currencyCodeSchema,
  defaultCostBasisMethod: costBasisMethodSchema,
  defaultTaxProfile: taxProfileSchema,
});

export const portfolioSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  reportingCurrencyCode: currencyCodeSchema,
  accountIds: z.array(z.uuid()),
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});

export const cashBalanceSchema = z.object({ currencyCode: currencyCodeSchema, amount: money });

export const investmentAccountSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  imageUploadId: z.uuid().nullable(),
  institutionLogoUrl: z.string().nullable(),
  broker: z.string().nullable(),
  country: z.string(),
  currencyCode: currencyCodeSchema,
  costBasisMethod: costBasisMethodSchema,
  taxProfile: taxProfileSchema,
  autoCreditIncome: z.boolean(),
  portfolioId: z.uuid().nullable(),
  cash: z.array(cashBalanceSchema),
  /** Positions market value plus cash across currencies, in the account currency. */
  positionsValue: money,
  totalValue: money,
  createdByUserId: createdByUserIdSchema,
});

export const fixedIncomeTermsSchema = z.object({
  issuer: z.string().nullable(),
  issueDate: isoDate.nullable(),
  maturityDate: isoDate.nullable(),
  principal: nullableDecimal,
  indexer: indexerSchema,
  rateForm: rateFormSchema,
  rate: decimal,
  couponSchedule: z.array(z.object({ date: isoDate, rate: z.string().optional() })).nullable(),
  liquidity: z.string().nullable(),
  fgcCovered: z.boolean(),
  dayCount: dayCountSchema,
  tesouroTitle: z.string().nullable(),
});

export const assetSchema = z.object({
  id: z.uuid(),
  symbol: z.string(),
  name: z.string(),
  assetClass: assetClassSchema,
  exchange: z.string().nullable(),
  country: z.string().nullable(),
  currencyCode: currencyCodeSchema,
  isin: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  logoUrl: z.string().nullable(),
  isCustom: z.boolean(),
  providerSymbols: z.record(z.string(), z.string()),
  tags: z.array(z.string()),
  fixedIncome: fixedIncomeTermsSchema.nullable(),
});

export const assetCandidateSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  assetClass: assetClassSchema.nullable(),
  exchange: z.string().nullable(),
  country: z.string().nullable(),
  currencyCode: z.string().nullable(),
  provider: z.string(),
  providerSymbol: z.string(),
  /** Set when the candidate is already in the catalog. */
  assetId: z.uuid().nullable(),
});

export const priceInfoSchema = z.object({
  price: decimal,
  currencyCode: currencyCodeSchema,
  asOf: z.string(),
  provider: z.string(),
  isDelayed: z.boolean(),
  isManual: z.boolean(),
  /** True when the price is older than the last trading day or comes from a trade. */
  isStale: z.boolean(),
  change: nullableDecimal,
  changePercent: nullableDecimal,
});

export const investmentEventSchema = z.object({
  id: z.uuid(),
  accountId: z.uuid(),
  assetId: z.uuid().nullable(),
  assetSymbol: z.string().nullable(),
  assetName: z.string().nullable(),
  type: investmentEventTypeSchema,
  tradeDate: isoDate,
  settlementDate: isoDate.nullable(),
  quantity: nullableDecimal,
  unitPrice: nullableDecimal,
  grossAmount: decimal,
  fees: decimal,
  taxesWithheld: decimal,
  netAmount: decimal,
  currencyCode: currencyCodeSchema,
  fxRateToAccountBase: nullableDecimal,
  notes: z.string().nullable(),
  source: z.string(),
  externalId: z.string().nullable(),
  relatedEventId: z.uuid().nullable(),
  transactionId: z.uuid().nullable(),
  meta: z.record(z.string(), z.unknown()),
  createdByUserId: createdByUserIdSchema,
  createdAt: wireDateTimeSchema,
});

export const fixedIncomePositionSchema = z.object({
  indexer: indexerSchema,
  rateForm: rateFormSchema,
  rate: decimal,
  maturityDate: isoDate.nullable(),
  daysToMaturity: z.number().int().nullable(),
  /** In-app accrued value (reporting currency). */
  curveValue: money,
  /** Provider market value (Tesouro buyback), when available. */
  marketValue: money.nullable(),
  accruedIsEstimated: z.boolean(),
  /** Estimated taxes if redeemed today. */
  estimatedIr: money,
  estimatedIof: money,
  netValue: money,
  /** Days left to a lower IR bracket or to the end of the IOF window, for warnings. */
  iofDaysRemaining: z.number().int().nullable(),
  nextIrBracketInDays: z.number().int().nullable(),
  fgcCovered: z.boolean(),
});

export const positionSchema = z.object({
  assetId: z.uuid(),
  symbol: z.string(),
  name: z.string(),
  assetClass: assetClassSchema,
  country: z.string().nullable(),
  sector: z.string().nullable(),
  industry: z.string().nullable(),
  currencyCode: currencyCodeSchema,
  accountIds: z.array(z.uuid()),
  quantity: decimal,
  /** Preço médio, in the asset currency. */
  averageCost: decimal,
  price: priceInfoSchema.nullable(),
  /** Amounts below are in the reporting currency. */
  invested: money,
  marketValue: money,
  /** Market value after estimated taxes on a sale/redemption today. */
  netValue: money,
  unrealizedPnl: money,
  unrealizedPnlPercent: decimal,
  /** Part of the P&L caused by exchange-rate moves (reporting currency). */
  fxEffect: money,
  realizedPnl: money,
  income: money,
  todayChange: money,
  percentOfPortfolio: decimal,
  fixedIncome: fixedIncomePositionSchema.nullable(),
});

export const lotSchema = z.object({
  lotId: z.string(),
  accountId: z.uuid(),
  acquiredDate: isoDate,
  quantity: decimal,
  unitCost: decimal,
  cost: money,
});

export const incomeTotalsSchema = z.object({ month: money, ytd: money, last12Months: money });

export const valuePointSchema = z.object({
  date: isoDate,
  value: money,
  invested: money,
  benchmark: money.nullable(),
});

export const allocationSliceSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: money,
  percent: decimal,
});

export const dashboardSchema = z.object({
  reportingCurrencyCode: currencyCodeSchema,
  net: z.boolean(),
  invested: money,
  marketValue: money,
  netValue: money,
  cash: money,
  unrealizedPnl: money,
  unrealizedPnlPercent: decimal,
  realizedPnl: money,
  todayChange: money,
  todayChangePercent: decimal,
  income: incomeTotalsSchema,
  twr: decimal.nullable(),
  xirr: decimal.nullable(),
  benchmarkReturn: decimal.nullable(),
  history: z.array(valuePointSchema),
  allocation: z.object({
    class: z.array(allocationSliceSchema),
    sector: z.array(allocationSliceSchema),
    country: z.array(allocationSliceSchema),
    currency: z.array(allocationSliceSchema),
  }),
  movers: z.array(
    z.object({ assetId: z.uuid(), symbol: z.string(), changePercent: decimal, changeValue: money }),
  ),
  upcoming: z.array(
    z.object({
      date: isoDate,
      kind: z.enum(["maturity", "coupon", "lock_in_end"]),
      assetId: z.uuid(),
      symbol: z.string(),
      amount: money.nullable(),
    }),
  ),
  priceFreshness: z.object({
    oldestAsOf: z.string().nullable(),
    providers: z.array(z.string()),
    staleAssets: z.number().int(),
    /** True while stale quotes are being fetched in the background; refetch shortly. */
    refreshing: z.boolean(),
  }),
  disclaimer: z.string(),
});

export const accountCashSchema = z.object({
  accountId: z.uuid(),
  cash: z.array(cashBalanceSchema),
  ledger: z.array(investmentEventSchema),
});

export const assetDetailSchema = z.object({
  asset: assetSchema,
  position: positionSchema.nullable(),
  lots: z.array(lotSchema),
  events: z.array(investmentEventSchema),
  chart: z.array(z.object({ date: isoDate, close: decimal })),
  averageCostLine: nullableDecimal,
  markers: z.array(
    z.object({
      date: isoDate,
      type: investmentEventTypeSchema,
      price: nullableDecimal,
      quantity: nullableDecimal,
    }),
  ),
  incomeByMonth: z.array(z.object({ month: z.string(), net: money })),
  fundamentals: z
    .object({
      sector: z.string().nullable(),
      industry: z.string().nullable(),
      description: z.string().nullable(),
      website: z.string().nullable(),
      marketCap: z.string().nullable(),
      dividendYield: z.string().nullable(),
      peRatio: z.string().nullable(),
    })
    .nullable(),
  fixedIncomeCurve: z.array(z.object({ date: isoDate, value: money, estimated: z.boolean() })),
  fixedIncomeProjection: z
    .object({
      maturityDate: isoDate,
      grossValue: money,
      netValue: money,
      taxBrackets: z.array(
        z.object({
          fromDay: z.number().int(),
          toDay: z.number().int().nullable(),
          ratePercent: decimal,
        }),
      ),
    })
    .nullable(),
});

export const incomeRowSchema = z.object({
  eventId: z.uuid(),
  date: isoDate,
  assetId: z.uuid().nullable(),
  symbol: z.string().nullable(),
  type: investmentEventTypeSchema,
  currencyCode: currencyCodeSchema,
  gross: money,
  withheld: money,
  net: money,
});
export const incomeReportSchema = z.object({
  reportingCurrencyCode: currencyCodeSchema,
  rows: z.array(incomeRowSchema),
  byMonth: z.array(z.object({ month: z.string(), gross: money, withheld: money, net: money })),
  byAsset: z.array(z.object({ assetId: z.uuid().nullable(), symbol: z.string(), net: money })),
  byType: z.array(z.object({ type: investmentEventTypeSchema, net: money })),
  totalGross: money,
  totalWithheld: money,
  totalNet: money,
});

export const apuracaoLineSchema = z.object({
  month: z.string(),
  bucket: z.enum(["COMMON_SWING", "FII_SWING", "DAY_TRADE"]),
  salesTotal: money,
  stockSalesTotal: money,
  gains: money,
  losses: money,
  result: money,
  exemptGain: money,
  lossCarriedIn: money,
  lossUsed: money,
  lossCarriedOut: money,
  taxableBase: money,
  ratePercent: decimal,
  taxBeforeCredit: money,
  irrfCredit: money,
  taxDue: money,
  belowMinimum: z.boolean(),
  darfCode: z.string(),
  dueDate: isoDate,
  paid: z.boolean(),
  paidAmount: money.nullable(),
});
export const usLotGainSchema = z.object({
  saleEventId: z.uuid(),
  assetId: z.uuid(),
  symbol: z.string(),
  quantity: decimal,
  acquiredDate: isoDate,
  saleDate: isoDate,
  proceeds: money,
  cost: money,
  gain: money,
  daysHeld: z.number().int(),
  term: z.enum(["SHORT", "LONG"]),
  estimatedTax: money,
  currencyCode: currencyCodeSchema,
});
export const annualSummarySchema = z.object({
  year: z.number().int(),
  reportingCurrencyCode: currencyCodeSchema,
  /** Bens e Direitos on Dec 31 at cost. */
  holdingsAtCost: z.array(
    z.object({
      assetId: z.uuid(),
      symbol: z.string(),
      name: z.string(),
      assetClass: assetClassSchema,
      quantity: decimal,
      cost: money,
      currencyCode: currencyCodeSchema,
    }),
  ),
  exemptIncome: money,
  taxedAtSource: money,
  exclusiveTaxIncome: money,
  realizedResult: money,
  offshoreEstimatedTax: money,
});
export const taxReportSchema = z.object({
  year: z.number().int(),
  profile: taxProfileSchema,
  apuracao: z.array(apuracaoLineSchema),
  usGains: z.array(usLotGainSchema),
  annual: annualSummarySchema,
  disclaimer: z.string(),
});

export const allocationReportSchema = z.object({
  reportingCurrencyCode: currencyCodeSchema,
  dimension: allocationDimensionSchema,
  total: money,
  slices: z.array(allocationSliceSchema),
  targets: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: money,
      currentPercent: decimal,
      targetPercent: decimal,
      drift: decimal,
    }),
  ),
});
export const rebalanceSchema = z.object({
  reportingCurrencyCode: currencyCodeSchema,
  contribution: money,
  rows: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: money,
      currentPercent: decimal,
      targetPercent: decimal,
      drift: decimal,
      buy: money,
    }),
  ),
});

export const providerStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  capabilities: z.array(z.string()),
  markets: z.array(z.string()),
  freshness: z.enum(["realtime", "delayed", "eod"]),
  requiresApiKey: z.boolean(),
  hasApiKey: z.boolean(),
  rateLimits: z.object({ perMinute: z.number().nullable(), perDay: z.number().nullable() }),
  remainingToday: z.number().nullable(),
  enabled: z.boolean(),
  priority: z.number().nullable(),
  premium: z.boolean(),
  health: z.object({
    successes: z.number(),
    failures: z.number(),
    lastSuccessAt: z.string().nullable(),
    lastFailureAt: z.string().nullable(),
    lastError: z.string().nullable(),
  }),
});

export const investmentImportRowSchema = z.object({
  row: z.number().int(),
  status: z.enum(["ok", "duplicate", "error", "unsupported"]),
  message: z.string().nullable(),
  event: z
    .object({
      type: investmentEventTypeSchema,
      tradeDate: isoDate,
      symbol: z.string().nullable(),
      quantity: nullableDecimal,
      unitPrice: nullableDecimal,
      grossAmount: decimal,
      fees: decimal,
      taxesWithheld: decimal,
      currencyCode: currencyCodeSchema,
    })
    .nullable(),
  raw: z.string().nullable(),
});
export const importPreviewSchema = z.object({
  batchId: z.uuid(),
  format: z.string(),
  total: z.number().int(),
  ok: z.number().int(),
  duplicates: z.number().int(),
  errors: z.number().int(),
  unsupported: z.number().int(),
  unsupportedTypes: z.array(z.string()),
  rows: z.array(investmentImportRowSchema),
});
export const importResultSchema = z.object({
  batchId: z.uuid(),
  created: z.number().int(),
  skipped: z.number().int(),
});
export const refreshResultSchema = z.object({
  quotes: z.number().int(),
  assets: z.number().int(),
  failures: z.array(z.object({ symbol: z.string(), message: z.string() })),
});

export const holdingsAtSchema = z.object({
  date: isoDate,
  rows: z.array(
    z.object({
      symbol: z.string(),
      name: z.string(),
      assetClass: assetClassSchema,
      quantity: decimal,
      averageCost: decimal,
      cost: money,
      currencyCode: currencyCodeSchema,
    }),
  ),
});

export const corporateActionSuggestionSchema = z.object({
  assetId: z.uuid(),
  accountId: z.uuid(),
  symbol: z.string(),
  kind: z.enum(["SPLIT", "REVERSE_SPLIT", "DIVIDEND"]),
  date: isoDate,
  paymentDate: isoDate.nullable(),
  ratioFrom: nullableDecimal,
  ratioTo: nullableDecimal,
  amountPerShare: nullableDecimal,
  quantityHeld: decimal,
  /** Dividends: shares held on the ex-date times the amount per share, in the asset currency. */
  suggestedGross: nullableDecimal,
  currencyCode: currencyCodeSchema,
  alreadyRecorded: z.boolean(),
  provider: z.string(),
});

export type CorporateActionSuggestion = z.output<typeof corporateActionSuggestionSchema>;
export type InvestmentAccount = z.output<typeof investmentAccountSchema>;
export type Portfolio = z.output<typeof portfolioSchema>;
export type InvestmentAsset = z.output<typeof assetSchema>;
export type AssetCandidate = z.output<typeof assetCandidateSchema>;
export type InvestmentEvent = z.output<typeof investmentEventSchema>;
export type InvestmentPosition = z.output<typeof positionSchema>;
export type InvestmentDashboard = z.output<typeof dashboardSchema>;
export type AssetDetail = z.output<typeof assetDetailSchema>;
export type IncomeReport = z.output<typeof incomeReportSchema>;
export type TaxReport = z.output<typeof taxReportSchema>;
export type ApuracaoLine = z.output<typeof apuracaoLineSchema>;
export type AllocationReport = z.output<typeof allocationReportSchema>;
export type RebalanceReport = z.output<typeof rebalanceSchema>;
export type ProviderStatus = z.output<typeof providerStatusSchema>;
export type ImportPreview = z.output<typeof importPreviewSchema>;
export type InvestmentSettings = z.output<typeof investmentSettingsSchema>;
export type FixedIncomeTerms = z.output<typeof fixedIncomeTermsSchema>;
export type AccountCash = z.output<typeof accountCashSchema>;
export type HoldingsAt = z.output<typeof holdingsAtSchema>;
