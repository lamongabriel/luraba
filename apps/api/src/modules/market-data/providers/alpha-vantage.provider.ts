import {
  type AssetCandidate,
  type Candle,
  type CorporateActionsProvider,
  type DividendRecord,
  type Fundamentals,
  type FundamentalsProvider,
  type HttpFetch,
  type InstrumentRef,
  type MarketDataProvider,
  PremiumRequiredError,
  type PriceHistoryProvider,
  type ProviderMetadata,
  type Quote,
  type QuoteProvider,
  RateLimitedError,
  type RequestContext,
  type SplitRecord,
  SymbolNotFoundError,
  type SymbolSearchProvider,
} from "../market-data.types";
import { assertHttpOk, defaultFetch } from "./http";

const BASE_URL = "https://www.alphavantage.co/query";

/**
 * Exchange suffixes. The mapping lives here (and in `asset_provider_symbols` for exceptions); the
 * domain never assumes a vendor symbol format.
 */
const SUFFIX_BY_MARKET: Record<string, string> = {
  BR: ".SAO",
  GB: ".LON",
  CA: ".TRT",
  DE: ".DEX",
  IN: ".BSE",
  CN: ".SHH",
};
const SUFFIX_BY_EXCHANGE: Record<string, string> = {
  SHZ: ".SHZ",
  SHH: ".SHH",
  TSX: ".TRT",
  LSE: ".LON",
};

export function alphaVantageSymbol(ref: InstrumentRef): string {
  const mapped = ref.providerSymbols?.alphavantage;
  if (mapped) return mapped;
  const suffix =
    (ref.exchange && SUFFIX_BY_EXCHANGE[ref.exchange.toUpperCase()]) ||
    SUFFIX_BY_MARKET[ref.market];
  return suffix ? `${ref.symbol}${suffix}` : ref.symbol;
}

/**
 * Alpha Vantage answers HTTP 200 even for failures. A body with `Note`, `Information` or
 * `Error Message` becomes a typed error so the router can fall back.
 */
export function assertAlphaVantageBody(body: Record<string, unknown>, what: string): void {
  const note = body.Note;
  const information = body.Information;
  const error = body["Error Message"];
  if (typeof error === "string") {
    throw new SymbolNotFoundError(`Alpha Vantage: ${error}`.slice(0, 200), "alphavantage");
  }
  const text = [note, information]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
  if (text) {
    if (/premium/i.test(text) && !/rate limit|requests per/i.test(text)) {
      throw new PremiumRequiredError(`Alpha Vantage ${what} is a premium endpoint`, "alphavantage");
    }
    if (/premium/i.test(text) && /subscribe|plan/i.test(text) && /endpoint/i.test(text)) {
      throw new PremiumRequiredError(`Alpha Vantage ${what} is a premium endpoint`, "alphavantage");
    }
    throw new RateLimitedError(`Alpha Vantage: ${text}`.slice(0, 200), "alphavantage");
  }
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export class AlphaVantageProvider
  implements
    MarketDataProvider,
    QuoteProvider,
    PriceHistoryProvider,
    SymbolSearchProvider,
    FundamentalsProvider,
    CorporateActionsProvider
{
  readonly metadata: ProviderMetadata = {
    id: "alphavantage",
    name: "Alpha Vantage",
    capabilities: ["quote", "history", "search", "fundamentals", "corporateActions"],
    markets: ["*"],
    assetClasses: "*",
    // Free tier (verify current limits): ~25 requests/day, 5/minute.
    rateLimits: { perMinute: 5, perDay: 25 },
    premiumRateLimits: { perMinute: 75 },
    requiresApiKey: true,
    freshness: "delayed",
    priority: 30,
  };

  constructor(private readonly http: HttpFetch = defaultFetch) {}

  private async call(
    params: Record<string, string>,
    ctx: RequestContext | undefined,
    what: string,
  ): Promise<Record<string, unknown>> {
    const url = new URL(BASE_URL);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("apikey", ctx?.apiKey ?? "");
    url.searchParams.set("datatype", "json");
    const response = await this.http(url.toString());
    assertHttpOk(response, "alphavantage", what);
    const body = (await response.json()) as Record<string, unknown>;
    assertAlphaVantageBody(body, what);
    return body;
  }

  async getQuote(ref: InstrumentRef, ctx?: RequestContext): Promise<Quote> {
    const symbol = alphaVantageSymbol(ref);
    const body = await this.call({ function: "GLOBAL_QUOTE", symbol }, ctx, `quote ${symbol}`);
    const quote = body["Global Quote"] as Record<string, string> | undefined;
    if (!quote || !quote["05. price"]) {
      throw new SymbolNotFoundError(`Alpha Vantage has no quote for ${symbol}`, "alphavantage");
    }
    return {
      symbol: ref.symbol,
      price: quote["05. price"],
      change: quote["09. change"] ?? null,
      changePercent: quote["10. change percent"]?.replace("%", "") ?? null,
      currency: ref.currency ?? (ref.market === "BR" ? "BRL" : "USD"),
      asOf: quote["07. latest trading day"]
        ? new Date(`${quote["07. latest trading day"]}T20:00:00Z`)
        : new Date(),
      isDelayed: true,
      provider: "alphavantage",
    };
  }

  async getHistory(
    ref: InstrumentRef,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<Candle[]> {
    const symbol = alphaVantageSymbol(ref);
    const today = new Date().toISOString().slice(0, 10);
    const longRange = daysBetween(from, today) > 100;
    // Free keys: compact daily (~100 trading days); long history through the weekly adjusted series.
    const fn = ctx?.premium
      ? "TIME_SERIES_DAILY_ADJUSTED"
      : longRange
        ? "TIME_SERIES_WEEKLY_ADJUSTED"
        : "TIME_SERIES_DAILY";
    const params: Record<string, string> = { function: fn, symbol };
    if (fn !== "TIME_SERIES_WEEKLY_ADJUSTED") params.outputsize = ctx?.premium ? "full" : "compact";
    const body = await this.call(params, ctx, `${fn} ${symbol}`);
    const seriesKey = Object.keys(body).find(
      (key) =>
        key.startsWith("Time Series") || key.startsWith("Weekly") || key.startsWith("Monthly"),
    );
    const series = seriesKey
      ? (body[seriesKey] as Record<string, Record<string, string>>)
      : undefined;
    if (!series)
      throw new SymbolNotFoundError(`Alpha Vantage has no history for ${symbol}`, "alphavantage");
    return Object.entries(series)
      .filter(([date]) => date >= from && date <= to)
      .map(([date, row]) => ({
        date,
        open: row["1. open"] ?? null,
        high: row["2. high"] ?? null,
        low: row["3. low"] ?? null,
        close: row["4. close"] as string,
        adjClose: row["5. adjusted close"] ?? null,
        volume: row["6. volume"] ?? row["5. volume"] ?? null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async search(query: string, ctx?: RequestContext): Promise<AssetCandidate[]> {
    const body = await this.call(
      { function: "SYMBOL_SEARCH", keywords: query },
      ctx,
      `search ${query}`,
    );
    const matches = (body.bestMatches ?? []) as Record<string, string>[];
    return matches.map((match) => {
      const providerSymbol = match["1. symbol"] as string;
      const brazilian = providerSymbol.endsWith(".SAO");
      return {
        symbol: brazilian ? providerSymbol.slice(0, -4) : providerSymbol,
        name: match["2. name"] as string,
        assetClass:
          match["3. type"] === "ETF" ? "ETF" : match["3. type"] === "Equity" ? "STOCK" : null,
        exchange: match["4. region"] ?? null,
        country: brazilian ? "BR" : match["4. region"] === "United States" ? "US" : null,
        currency: match["8. currency"] ?? null,
        provider: "alphavantage" as const,
        providerSymbol,
      };
    });
  }

  async getFundamentals(ref: InstrumentRef, ctx?: RequestContext): Promise<Fundamentals> {
    const symbol = alphaVantageSymbol(ref);
    const body = await this.call({ function: "OVERVIEW", symbol }, ctx, `overview ${symbol}`);
    if (!body.Symbol) {
      const etf = await this.call(
        { function: "ETF_PROFILE", symbol },
        ctx,
        `ETF profile ${symbol}`,
      );
      if (!etf.net_assets && !etf.sectors)
        throw new SymbolNotFoundError(`Alpha Vantage has no profile for ${symbol}`, "alphavantage");
      const sectors = (etf.sectors ?? []) as { sector: string }[];
      return {
        sector: sectors[0]?.sector ?? null,
        industry: null,
        description: null,
        website: null,
        marketCap: null,
        dividendYield: etf.dividend_yield ? String(etf.dividend_yield) : null,
        peRatio: null,
        provider: "alphavantage",
      };
    }
    const text = (key: string): string | null =>
      typeof body[key] === "string" && body[key] !== "None" ? (body[key] as string) : null;
    return {
      sector: text("Sector"),
      industry: text("Industry"),
      description: text("Description"),
      website: text("OfficialSite"),
      marketCap: text("MarketCapitalization"),
      dividendYield: text("DividendYield"),
      peRatio: text("PERatio"),
      provider: "alphavantage",
    };
  }

  async getDividends(
    ref: InstrumentRef,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<DividendRecord[]> {
    const symbol = alphaVantageSymbol(ref);
    const body = await this.call({ function: "DIVIDENDS", symbol }, ctx, `dividends ${symbol}`);
    const rows = (body.data ?? []) as Record<string, string>[];
    return rows
      .filter((row) => (row.ex_dividend_date ?? "") >= from && (row.ex_dividend_date ?? "") <= to)
      .map((row) => ({
        exDate: row.ex_dividend_date as string,
        paymentDate: row.payment_date && row.payment_date !== "None" ? row.payment_date : null,
        amount: row.amount as string,
        currency: ref.currency ?? null,
      }));
  }

  async getSplits(
    ref: InstrumentRef,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<SplitRecord[]> {
    const symbol = alphaVantageSymbol(ref);
    const body = await this.call({ function: "SPLITS", symbol }, ctx, `splits ${symbol}`);
    const rows = (body.data ?? []) as Record<string, string>[];
    return rows
      .filter((row) => (row.effective_date ?? "") >= from && (row.effective_date ?? "") <= to)
      .map((row) => {
        const [numerator, denominator] = (row.split_factor ?? "1:1").split(":");
        return {
          date: row.effective_date as string,
          numerator: numerator ?? "1",
          denominator: denominator ?? "1",
        };
      });
  }
}
