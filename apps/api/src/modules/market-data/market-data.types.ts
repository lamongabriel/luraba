import type { MarketDataCapability, MarketDataProviderId } from "@/config/market-data";

export type { MarketDataCapability, MarketDataProviderId };

/** A normalised instrument reference. Providers translate it to their own symbol format. */
export type InstrumentRef = {
  /** The asset's symbol in the catalog, for example `PETR4` or `AAPL`. */
  symbol: string;
  /** ISO country code of the listing market (`BR`, `US`...). */
  market: string;
  exchange?: string | null;
  assetClass?: string | null;
  currency?: string | null;
  /** Rows of `asset_provider_symbols`, keyed by provider id. Wins over any default mapping. */
  providerSymbols?: Partial<Record<string, string>>;
};

export type Quote = {
  symbol: string;
  price: string;
  change: string | null;
  changePercent: string | null;
  currency: string;
  asOf: Date;
  isDelayed: boolean;
  provider: MarketDataProviderId;
};

export type Candle = {
  date: string;
  open: string | null;
  high: string | null;
  low: string | null;
  close: string;
  adjClose?: string | null;
  volume?: string | null;
};

export type AssetCandidate = {
  symbol: string;
  name: string;
  assetClass: string | null;
  exchange: string | null;
  country: string | null;
  currency: string | null;
  provider: MarketDataProviderId;
  providerSymbol: string;
};

export type Fundamentals = {
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  marketCap: string | null;
  dividendYield: string | null;
  peRatio: string | null;
  provider: MarketDataProviderId;
};

export type DividendRecord = {
  exDate: string;
  paymentDate: string | null;
  amount: string;
  currency: string | null;
};
export type SplitRecord = { date: string; numerator: string; denominator: string };

export const MACRO_SERIES = [
  "CDI_DAILY",
  "SELIC_DAILY",
  "SELIC_TARGET",
  "IPCA_MONTHLY",
  "IGPM_MONTHLY",
  "US_CPI_MONTHLY",
] as const;
export type MacroSeriesId = (typeof MACRO_SERIES)[number];
/** Daily and monthly rates are percentages as published (0.0551 means 0.0551% per day). */
export type MacroPoint = { date: string; value: string };

export type TreasuryPrice = {
  title: string;
  maturityDate: string;
  date: string;
  buyYield: string | null;
  sellYield: string | null;
  buyPrice: string | null;
  /** Buyback ("resgate") unit price: what the holder gets selling today. */
  sellPrice: string | null;
  basePrice: string | null;
};

export type RequestContext = {
  /** A per-household key overriding the process-level key. */
  apiKey?: string;
  premium?: boolean;
};

export interface QuoteProvider {
  getQuote(ref: InstrumentRef, ctx?: RequestContext): Promise<Quote>;
}
export interface PriceHistoryProvider {
  getHistory(ref: InstrumentRef, from: string, to: string, ctx?: RequestContext): Promise<Candle[]>;
}
export interface SymbolSearchProvider {
  search(query: string, ctx?: RequestContext): Promise<AssetCandidate[]>;
}
export interface FundamentalsProvider {
  getFundamentals(ref: InstrumentRef, ctx?: RequestContext): Promise<Fundamentals>;
}
export interface CorporateActionsProvider {
  getDividends(
    ref: InstrumentRef,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<DividendRecord[]>;
  getSplits(
    ref: InstrumentRef,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<SplitRecord[]>;
}
export interface MacroIndexProvider {
  getSeries(
    series: MacroSeriesId,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<MacroPoint[]>;
}
export interface FixedIncomePriceProvider {
  getTreasuryPrices(ctx?: RequestContext): Promise<TreasuryPrice[]>;
}

export type Freshness = "realtime" | "delayed" | "eod";

export type ProviderMetadata = {
  id: MarketDataProviderId;
  name: string;
  capabilities: readonly MarketDataCapability[];
  /** ISO country codes served well, or `*` for global. */
  markets: readonly string[];
  assetClasses: readonly string[] | "*";
  rateLimits: { perMinute?: number; perDay?: number };
  /** Limits applied when the household flags the key as premium. */
  premiumRateLimits?: { perMinute?: number; perDay?: number };
  requiresApiKey: boolean;
  freshness: Freshness;
  /** Lower is tried first when nothing configures an order. */
  priority: number;
};

/** Every provider implements any subset of the capability interfaces and declares its metadata. */
export type MarketDataProvider = {
  readonly metadata: ProviderMetadata;
} & Partial<
  QuoteProvider &
    PriceHistoryProvider &
    SymbolSearchProvider &
    FundamentalsProvider &
    CorporateActionsProvider &
    MacroIndexProvider &
    FixedIncomePriceProvider
>;

export type ProviderErrorCode =
  | "RATE_LIMITED"
  | "PREMIUM_REQUIRED"
  | "NOT_FOUND"
  | "TIMEOUT"
  | "UNAVAILABLE"
  | "UNSUPPORTED";

/** Typed provider failure. The router decides on fallback from `code`. */
export class MarketDataError extends Error {
  constructor(
    readonly code: ProviderErrorCode,
    message: string,
    readonly provider?: string,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}
export class RateLimitedError extends MarketDataError {
  constructor(message = "Rate limit reached", provider?: string) {
    super("RATE_LIMITED", message, provider);
    this.name = "RateLimitedError";
  }
}
export class PremiumRequiredError extends MarketDataError {
  constructor(message = "This endpoint requires a premium plan", provider?: string) {
    super("PREMIUM_REQUIRED", message, provider);
    this.name = "PremiumRequiredError";
  }
}
export class SymbolNotFoundError extends MarketDataError {
  constructor(message = "Symbol not found", provider?: string) {
    super("NOT_FOUND", message, provider);
    this.name = "SymbolNotFoundError";
  }
}
export class ProviderTimeoutError extends MarketDataError {
  constructor(message = "Provider timed out", provider?: string) {
    super("TIMEOUT", message, provider);
    this.name = "ProviderTimeoutError";
  }
}
export class ProviderUnavailableError extends MarketDataError {
  constructor(message = "Provider unavailable", provider?: string) {
    super("UNAVAILABLE", message, provider);
    this.name = "ProviderUnavailableError";
  }
}

export type HttpFetch = (
  input: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;
