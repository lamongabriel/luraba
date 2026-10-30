import YahooFinance from "yahoo-finance2";
import {
  type AssetCandidate,
  type Candle,
  type CorporateActionsProvider,
  type DividendRecord,
  type Fundamentals,
  type FundamentalsProvider,
  type InstrumentRef,
  type MarketDataProvider,
  type PriceHistoryProvider,
  type ProviderMetadata,
  ProviderUnavailableError,
  type Quote,
  type QuoteProvider,
  RateLimitedError,
  type SplitRecord,
  SymbolNotFoundError,
  type SymbolSearchProvider,
} from "../market-data.types";

/** The slice of yahoo-finance2 this adapter uses, so tests can inject recorded responses. */
export type YahooClient = {
  quote(symbol: string): Promise<Record<string, unknown> | undefined>;
  chart(symbol: string, options: Record<string, unknown>): Promise<Record<string, unknown>>;
  search(query: string): Promise<{ quotes?: Record<string, unknown>[] }>;
  quoteSummary(
    symbol: string,
    options: { modules: string[] },
  ): Promise<Record<string, Record<string, unknown> | undefined>>;
};

/** Yahoo's symbol format lives here only; the domain stores plain symbols. */
export function yahooSymbol(ref: InstrumentRef): string {
  const mapped = ref.providerSymbols?.yahoo;
  if (mapped) return mapped;
  if (ref.assetClass === "CRYPTO") return `${ref.symbol}-USD`;
  if (ref.market === "BR") return `${ref.symbol}.SA`;
  return ref.symbol;
}

const str = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);
const isoDate = (value: unknown): string =>
  (value instanceof Date ? value : new Date(value as string | number)).toISOString().slice(0, 10);

function mapError(error: unknown, symbol: string): never {
  const message = error instanceof Error ? error.message : String(error);
  if (/not found|no data found|delisted|symbol may be delisted/i.test(message)) {
    throw new SymbolNotFoundError(`Yahoo has no data for ${symbol}`, "yahoo");
  }
  if (/429|too many requests|rate/i.test(message)) throw new RateLimitedError(message, "yahoo");
  throw new ProviderUnavailableError(message, "yahoo");
}

export class YahooProvider
  implements
    MarketDataProvider,
    QuoteProvider,
    PriceHistoryProvider,
    SymbolSearchProvider,
    FundamentalsProvider,
    CorporateActionsProvider
{
  readonly metadata: ProviderMetadata = {
    id: "yahoo",
    name: "Yahoo Finance",
    capabilities: ["quote", "history", "search", "fundamentals", "corporateActions"],
    markets: ["*"],
    assetClasses: "*",
    rateLimits: { perMinute: 30 },
    requiresApiKey: false,
    freshness: "delayed",
    priority: 10,
  };

  constructor(
    private readonly client: YahooClient = new (YahooFinance as unknown as new () => YahooClient)(),
  ) {}

  async getQuote(ref: InstrumentRef): Promise<Quote> {
    const symbol = yahooSymbol(ref);
    let raw: Record<string, unknown> | undefined;
    try {
      raw = await this.client.quote(symbol);
    } catch (error) {
      mapError(error, symbol);
    }
    if (!raw || raw.regularMarketPrice === undefined || raw.regularMarketPrice === null) {
      throw new SymbolNotFoundError(`Yahoo has no quote for ${symbol}`, "yahoo");
    }
    return {
      symbol: ref.symbol,
      price: String(raw.regularMarketPrice),
      change: str(raw.regularMarketChange),
      changePercent: str(raw.regularMarketChangePercent),
      currency: String(raw.currency ?? ref.currency ?? "USD"),
      asOf: raw.regularMarketTime
        ? new Date(raw.regularMarketTime as string | number | Date)
        : new Date(),
      isDelayed:
        raw.exchangeDataDelayedBy === undefined ? true : Number(raw.exchangeDataDelayedBy) > 0,
      provider: "yahoo",
    };
  }

  async getHistory(ref: InstrumentRef, from: string, to: string): Promise<Candle[]> {
    const symbol = yahooSymbol(ref);
    let result: Record<string, unknown>;
    try {
      result = await this.client.chart(symbol, {
        period1: new Date(`${from}T00:00:00Z`),
        period2: new Date(`${to}T23:59:59Z`),
        interval: "1d",
      });
    } catch (error) {
      mapError(error, symbol);
    }
    const quotes = (result.quotes ?? []) as Record<string, unknown>[];
    return quotes
      .filter((row) => row.close !== null && row.close !== undefined)
      .map((row) => ({
        date: isoDate(row.date),
        open: str(row.open),
        high: str(row.high),
        low: str(row.low),
        close: String(row.close),
        adjClose: str(row.adjclose),
        volume: str(row.volume),
      }));
  }

  async search(query: string): Promise<AssetCandidate[]> {
    let result: { quotes?: Record<string, unknown>[] };
    try {
      result = await this.client.search(query);
    } catch (error) {
      mapError(error, query);
    }
    return (result.quotes ?? [])
      .filter((row) => typeof row.symbol === "string")
      .map((row) => {
        const providerSymbol = String(row.symbol);
        const brazilian = providerSymbol.endsWith(".SA");
        return {
          symbol: brazilian ? providerSymbol.slice(0, -3) : providerSymbol,
          name: String(row.longname ?? row.shortname ?? providerSymbol),
          assetClass: yahooClass(str(row.quoteType)),
          exchange: str(row.exchDisp ?? row.exchange),
          country: brazilian ? "BR" : null,
          currency: null,
          provider: "yahoo" as const,
          providerSymbol,
        };
      });
  }

  async getFundamentals(ref: InstrumentRef): Promise<Fundamentals> {
    const symbol = yahooSymbol(ref);
    let summary: Record<string, Record<string, unknown> | undefined>;
    try {
      summary = await this.client.quoteSummary(symbol, {
        modules: ["assetProfile", "summaryDetail"],
      });
    } catch (error) {
      mapError(error, symbol);
    }
    const profile = summary.assetProfile ?? {};
    const detail = summary.summaryDetail ?? {};
    return {
      sector: str(profile.sector),
      industry: str(profile.industry),
      description: str(profile.longBusinessSummary),
      website: str(profile.website),
      marketCap: str(detail.marketCap),
      dividendYield: str(detail.dividendYield),
      peRatio: str(detail.trailingPE),
      provider: "yahoo",
    };
  }

  private async events(ref: InstrumentRef, from: string, to: string) {
    const symbol = yahooSymbol(ref);
    try {
      const result = await this.client.chart(symbol, {
        period1: new Date(`${from}T00:00:00Z`),
        period2: new Date(`${to}T23:59:59Z`),
        interval: "1d",
        events: "div|split",
      });
      return (result.events ?? {}) as {
        dividends?: Record<string, unknown>[];
        splits?: Record<string, unknown>[];
      };
    } catch (error) {
      return mapError(error, symbol);
    }
  }

  async getDividends(ref: InstrumentRef, from: string, to: string): Promise<DividendRecord[]> {
    const events = await this.events(ref, from, to);
    return (events.dividends ?? []).map((row) => ({
      exDate: isoDate(row.date),
      paymentDate: null,
      amount: String(row.amount),
      currency: ref.currency ?? null,
    }));
  }

  async getSplits(ref: InstrumentRef, from: string, to: string): Promise<SplitRecord[]> {
    const events = await this.events(ref, from, to);
    return (events.splits ?? []).map((row) => ({
      date: isoDate(row.date),
      numerator: String(row.numerator),
      denominator: String(row.denominator),
    }));
  }
}

function yahooClass(quoteType: string | null): string | null {
  switch (quoteType) {
    case "EQUITY":
      return "STOCK";
    case "ETF":
      return "ETF";
    case "MUTUALFUND":
      return "MUTUAL_FUND";
    case "CRYPTOCURRENCY":
      return "CRYPTO";
    default:
      return null;
  }
}
