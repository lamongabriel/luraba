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
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const FIXED_INCOME_CLASSES: readonly AssetClass[] = [
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
];

export function isFixedIncomeClass(assetClass: AssetClass): boolean {
  return FIXED_INCOME_CLASSES.includes(assetClass);
}

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
export type InvestmentEventType = (typeof INVESTMENT_EVENT_TYPES)[number];

export const CASH_EVENT_TYPES: readonly InvestmentEventType[] = [
  "DEPOSIT",
  "WITHDRAWAL",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "FX_CONVERSION",
  "FEE",
  "TAX_PAYMENT",
  "INTEREST_ON_CASH",
];
export const INCOME_EVENT_TYPES: readonly InvestmentEventType[] = [
  "DIVIDEND",
  "JCP",
  "FII_INCOME",
  "COUPON",
  "BOND_INTEREST",
];

export const COST_BASIS_METHODS = ["AVERAGE", "FIFO", "SPECIFIC_LOT"] as const;
export type CostBasisMethod = (typeof COST_BASIS_METHODS)[number];

export const TAX_PROFILES = ["BR_INDIVIDUAL", "US_NONRESIDENT", "US_RESIDENT", "NONE"] as const;
export type TaxProfile = (typeof TAX_PROFILES)[number];

export const INDEXERS = [
  "PREFIXADO",
  "CDI",
  "SELIC",
  "IPCA",
  "IGPM",
  "US_FIXED",
  "US_CPI",
] as const;
export type Indexer = (typeof INDEXERS)[number];
export const RATE_FORMS = ["PCT_OF_INDEXER", "INDEXER_PLUS_SPREAD", "FIXED_ANNUAL"] as const;
export type RateForm = (typeof RATE_FORMS)[number];
export const DAY_COUNTS = ["BUS_252", "ACT_360", "ACT_365"] as const;
export type DayCount = (typeof DAY_COUNTS)[number];

/** Dates are `YYYY-MM-DD` strings everywhere in the engine; amounts are decimal strings. */
export type IsoDate = string;

export type EventMeta = {
  /** SPLIT / REVERSE_SPLIT: quantity multiplier is `ratioTo / ratioFrom` (1:10 split => from 1, to 10). */
  ratioFrom?: string;
  ratioTo?: string;
  /** SPIN_OFF / MERGER / TICKER_CHANGE: the asset that receives the position. */
  targetAssetId?: string;
  /** SPIN_OFF: share of the parent's cost moved to the new asset (0..1). */
  costRatio?: string;
  /** MERGER: new shares per old share (default 1). */
  exchangeRatio?: string;
  /** FX_CONVERSION: destination currency and amount credited. */
  toCurrency?: string;
  toAmount?: string;
  /** SPECIFIC_LOT sells: `[{ lotId: <buy event id>, quantity }]`. */
  lots?: { lotId: string; quantity: string }[];
};

export type LedgerEvent = {
  id: string;
  type: InvestmentEventType;
  assetId?: string | null;
  tradeDate: IsoDate;
  quantity?: string | null;
  unitPrice?: string | null;
  grossAmount: string;
  fees?: string | null;
  taxesWithheld?: string | null;
  netAmount?: string | null;
  /** Currency of the amounts (the asset's trading currency, or the cash currency). */
  currency: string;
  /** Rate converting `currency` to the account base currency, captured at the event date. */
  fxRateToBase?: string | null;
  meta?: EventMeta | null;
};
