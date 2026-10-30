/**
 * Market-data routing, like config/fx.ts: which provider answers which capability for which market.
 * Changing the default quote provider (for example Yahoo -> Alpha Vantage) is an edit here, or a
 * per-household priority in `market_data_provider_settings`; no domain code changes.
 */
export const MARKET_DATA_PROVIDER_IDS = [
  "yahoo",
  "alphavantage",
  "brapi",
  "bcb",
  "tesouro",
  "mock",
] as const;
export type MarketDataProviderId = (typeof MARKET_DATA_PROVIDER_IDS)[number];

export const MARKET_DATA_CAPABILITIES = [
  "quote",
  "history",
  "search",
  "fundamentals",
  "corporateActions",
  "macro",
  "fixedIncomePrices",
] as const;
export type MarketDataCapability = (typeof MARKET_DATA_CAPABILITIES)[number];

/** `*` is the fallback list for any market not listed. */
export const MARKET_DATA_ROUTES: Record<
  MarketDataCapability,
  Record<string, readonly MarketDataProviderId[]>
> = {
  quote: {
    BR: ["brapi", "yahoo", "alphavantage"],
    US: ["yahoo", "alphavantage"],
    "*": ["yahoo", "alphavantage"],
  },
  history: {
    BR: ["brapi", "yahoo", "alphavantage"],
    US: ["yahoo", "alphavantage"],
    "*": ["yahoo", "alphavantage"],
  },
  search: {
    BR: ["yahoo", "brapi", "alphavantage"],
    US: ["yahoo", "alphavantage"],
    "*": ["yahoo", "alphavantage"],
  },
  fundamentals: {
    BR: ["yahoo", "alphavantage"],
    US: ["yahoo", "alphavantage"],
    "*": ["yahoo", "alphavantage"],
  },
  corporateActions: {
    BR: ["brapi", "yahoo", "alphavantage"],
    US: ["yahoo", "alphavantage"],
    "*": ["yahoo", "alphavantage"],
  },
  macro: { BR: ["bcb"], "*": ["bcb"] },
  fixedIncomePrices: { BR: ["tesouro"], "*": ["tesouro"] },
};

/** Development/CI without keys can force the fixture provider with MARKET_DATA_FORCE_MOCK=true. */
export const MARKET_DATA_FORCE_MOCK = process.env.MARKET_DATA_FORCE_MOCK === "true";

/** Quote freshness: seconds a cached quote is reused while the market is open / closed. */
export const QUOTE_TTL_OPEN_SECONDS = 60;
export const QUOTE_TTL_CLOSED_SECONDS = 6 * 60 * 60;
