import type {
  AllocationDimension,
  Benchmark,
  CostBasisMethod,
  Indexer,
  PerformancePeriod,
  RateForm,
  TaxProfile,
} from "@luraba/contracts";

/** Labels for the investment enums. The enum values live in `@luraba/contracts`. */

export const PERIOD_LABELS: Record<PerformancePeriod, string> = {
  "1M": "1M",
  "3M": "3M",
  "6M": "6M",
  YTD: "YTD",
  "1Y": "1Y",
  "5Y": "5Y",
  MAX: "All",
};

export const BENCHMARK_LABELS: Record<Benchmark, string> = {
  CDI: "CDI",
  IBOVESPA: "Ibovespa",
  IFIX: "IFIX",
  SP500: "S&P 500",
  IPCA: "IPCA",
  IPCA_PLUS_6: "IPCA + 6%",
};

export const DIMENSION_LABELS: Record<AllocationDimension, string> = {
  class: "Asset class",
  sector: "Sector",
  industry: "Industry",
  country: "Country",
  currency: "Currency",
  account: "Account",
  portfolio: "Portfolio",
  asset: "Asset",
};

export const COST_BASIS_LABELS: Record<CostBasisMethod, string> = {
  AVERAGE: "Average cost",
  FIFO: "First in, first out (FIFO)",
  SPECIFIC_LOT: "Specific lot",
};

export const TAX_PROFILE_LABELS: Record<TaxProfile, string> = {
  BR_INDIVIDUAL: "Brazil, individual",
  US_NONRESIDENT: "United States, non-resident",
  US_RESIDENT: "United States, resident",
  NONE: "No tax estimates",
};

export const INDEXER_LABELS: Record<Indexer, string> = {
  PREFIXADO: "Fixed rate",
  CDI: "CDI",
  SELIC: "Selic",
  IPCA: "IPCA",
  IGPM: "IGP-M",
  US_FIXED: "US fixed",
  US_CPI: "US CPI",
};

export const RATE_FORM_LABELS: Record<RateForm, string> = {
  PCT_OF_INDEXER: "% of the index",
  INDEXER_PLUS_SPREAD: "Index + spread",
  FIXED_ANNUAL: "Fixed per year",
};

export const DARF_BUCKET_LABELS = {
  COMMON_SWING: "Stocks and ETFs (swing trade)",
  FII_SWING: "REIT funds (swing trade)",
  DAY_TRADE: "Day trade",
} as const;

/** The standing legal note shown wherever a tax figure appears. */
export const TAX_DISCLAIMER =
  "Tax figures are estimates built from rules that change. Verify them with a tax professional before filing or paying.";
