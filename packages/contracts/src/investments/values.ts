import { z } from "zod";

/** Mirrors `@luraba/domain/investments` (parity is asserted in the API tests). */
export const ASSET_CLASSES = [
  "STOCK",
  "ETF",
  "BDR",
  "FII",
  "FIAGRO",
  "REIT",
  "UNIT",
  "MUTUAL_FUND",
  "CRYPTO",
  "TESOURO_DIRETO",
  "CDB",
  "LCI",
  "LCA",
  "LC",
  "LCD",
  "DEBENTURE",
  "DEBENTURE_INCENTIVADA",
  "CRI",
  "CRA",
  "POUPANCA",
  "US_TREASURY_BILL",
  "US_TREASURY_NOTE",
  "US_TREASURY_BOND",
  "US_TIPS",
  "US_I_BOND",
  "CD",
  "CORPORATE_BOND",
  "CASH_EQUIVALENT",
  "OTHER",
] as const;

export const INVESTMENT_EVENT_TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "FX_CONVERSION",
  "FEE",
  "TAX_PAYMENT",
  "INTEREST_ON_CASH",
  "BUY",
  "SELL",
  "SUBSCRIPTION",
  "DIVIDEND",
  "JCP",
  "FII_INCOME",
  "COUPON",
  "BOND_INTEREST",
  "AMORTIZATION",
  "RETURN_OF_CAPITAL",
  "SPLIT",
  "REVERSE_SPLIT",
  "BONUS_SHARES",
  "SUBSCRIPTION_RIGHT_RECEIVED",
  "SPIN_OFF",
  "MERGER",
  "TICKER_CHANGE",
  "DELISTING",
  "FI_APPLICATION",
  "FI_REDEMPTION",
  "FI_MATURITY",
] as const;

export const COST_BASIS_METHODS = ["AVERAGE", "FIFO", "SPECIFIC_LOT"] as const;
export const TAX_PROFILES = ["BR_INDIVIDUAL", "US_NONRESIDENT", "US_RESIDENT", "NONE"] as const;
export const INDEXERS = [
  "PREFIXADO",
  "CDI",
  "SELIC",
  "IPCA",
  "IGPM",
  "US_FIXED",
  "US_CPI",
] as const;
export const RATE_FORMS = ["PCT_OF_INDEXER", "INDEXER_PLUS_SPREAD", "FIXED_ANNUAL"] as const;
export const DAY_COUNTS = ["BUS_252", "ACT_360", "ACT_365"] as const;
export const ALLOCATION_DIMENSIONS = [
  "class",
  "sector",
  "industry",
  "country",
  "currency",
  "account",
  "portfolio",
  "asset",
] as const;
export const PERFORMANCE_PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "5Y", "MAX"] as const;
export const BENCHMARKS = ["CDI", "IBOVESPA", "IFIX", "SP500", "IPCA", "IPCA_PLUS_6"] as const;

export const assetClassSchema = z.enum(ASSET_CLASSES);
export const investmentEventTypeSchema = z.enum(INVESTMENT_EVENT_TYPES);
export const costBasisMethodSchema = z.enum(COST_BASIS_METHODS);
export const taxProfileSchema = z.enum(TAX_PROFILES);
export const indexerSchema = z.enum(INDEXERS);
export const rateFormSchema = z.enum(RATE_FORMS);
export const dayCountSchema = z.enum(DAY_COUNTS);
export const allocationDimensionSchema = z.enum(ALLOCATION_DIMENSIONS);
export const performancePeriodSchema = z.enum(PERFORMANCE_PERIODS);
export const benchmarkSchema = z.enum(BENCHMARKS);

/** Exact decimal on the wire: a plain string, never a float. Accepts numbers on input. */
export const decimalStringSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^-?\d+(\.\d+)?$/u.test(value), "Enter a valid decimal number");
export const nonNegativeDecimalSchema = decimalStringSchema.refine(
  (value) => !value.startsWith("-"),
  "Must not be negative",
);
export const isoDateSchema = z.iso.date();

export type AssetClass = (typeof ASSET_CLASSES)[number];
export type InvestmentEventType = (typeof INVESTMENT_EVENT_TYPES)[number];
export type CostBasisMethod = (typeof COST_BASIS_METHODS)[number];
export type TaxProfile = (typeof TAX_PROFILES)[number];
export type Indexer = (typeof INDEXERS)[number];
export type RateForm = (typeof RATE_FORMS)[number];
export type AllocationDimension = (typeof ALLOCATION_DIMENSIONS)[number];
export type PerformancePeriod = (typeof PERFORMANCE_PERIODS)[number];
export type Benchmark = (typeof BENCHMARKS)[number];
