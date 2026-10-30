import {
  type AssetCandidate,
  type Candle,
  type CorporateActionsProvider,
  type DividendRecord,
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

const BASE_URL = "https://brapi.dev/api";

function rangeFor(from: string): string {
  const days = Math.round((Date.now() - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
  if (days <= 31) return "1mo";
  if (days <= 93) return "3mo";
  if (days <= 186) return "6mo";
  if (days <= 366) return "1y";
  if (days <= 732) return "2y";
  if (days <= 1830) return "5y";
  if (days <= 3660) return "10y";
  return "max";
}

const text = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

export class BrapiProvider
  implements
    MarketDataProvider,
    QuoteProvider,
    PriceHistoryProvider,
    SymbolSearchProvider,
    CorporateActionsProvider
{
  readonly metadata: ProviderMetadata = {
    id: "brapi",
    name: "brapi.dev",
    capabilities: ["quote", "history", "search", "corporateActions"],
    markets: ["BR"],
    assetClasses: ["STOCK", "ETF", "BDR", "FII", "FIAGRO", "UNIT"],
    rateLimits: { perMinute: 30 },
    requiresApiKey: true,
    freshness: "delayed",
    priority: 5,
  };

  constructor(private readonly http: HttpFetch = defaultFetch) {}

  private async fetchQuote(
    ref: InstrumentRef,
    ctx: RequestContext | undefined,
    query: Record<string, string>,
  ): Promise<Record<string, unknown>> {
    const symbol = ref.providerSymbols?.brapi ?? ref.symbol;
    const url = new URL(`${BASE_URL}/quote/${encodeURIComponent(symbol)}`);
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    url.searchParams.set("token", ctx?.apiKey ?? "");
    const response = await this.http(url.toString());
    if (response.status === 402)
      throw new PremiumRequiredError("brapi plan does not include this data", "brapi");
    if (response.status === 401 || response.status === 403) {
      throw new PremiumRequiredError("brapi token missing or not allowed for this symbol", "brapi");
    }
    if (response.status === 429) throw new RateLimitedError("brapi rate limit", "brapi");
    assertHttpOk(response, "brapi", symbol);
    const body = (await response.json()) as { results?: Record<string, unknown>[]; error?: string };
    const result = body.results?.[0];
    if (!result)
      throw new SymbolNotFoundError(body.error ?? `brapi has no data for ${symbol}`, "brapi");
    return result;
  }

  async getQuote(ref: InstrumentRef, ctx?: RequestContext): Promise<Quote> {
    const result = await this.fetchQuote(ref, ctx, {});
    if (result.regularMarketPrice === undefined || result.regularMarketPrice === null) {
      throw new SymbolNotFoundError(`brapi has no price for ${ref.symbol}`, "brapi");
    }
    return {
      symbol: ref.symbol,
      price: String(result.regularMarketPrice),
      change: text(result.regularMarketChange),
      changePercent: text(result.regularMarketChangePercent),
      currency: String(result.currency ?? "BRL"),
      asOf: result.regularMarketTime ? new Date(result.regularMarketTime as string) : new Date(),
      isDelayed: true,
      provider: "brapi",
    };
  }

  async getHistory(
    ref: InstrumentRef,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<Candle[]> {
    const result = await this.fetchQuote(ref, ctx, { range: rangeFor(from), interval: "1d" });
    const rows = (result.historicalDataPrice ?? []) as Record<string, unknown>[];
    return rows
      .map((row) => ({
        date: new Date((row.date as number) * 1000).toISOString().slice(0, 10),
        open: text(row.open),
        high: text(row.high),
        low: text(row.low),
        close: String(row.close),
        adjClose: text(row.adjustedClose),
        volume: text(row.volume),
      }))
      .filter((candle) => candle.date >= from && candle.date <= to && candle.close !== "null");
  }

  async search(query: string, ctx?: RequestContext): Promise<AssetCandidate[]> {
    const url = new URL(`${BASE_URL}/available`);
    url.searchParams.set("search", query);
    url.searchParams.set("token", ctx?.apiKey ?? "");
    const response = await this.http(url.toString());
    assertHttpOk(response, "brapi", `search ${query}`);
    const body = (await response.json()) as { stocks?: string[] };
    return (body.stocks ?? []).map((symbol) => ({
      symbol,
      name: symbol,
      assetClass: /11$/.test(symbol) ? "FII" : "STOCK",
      exchange: "BVMF",
      country: "BR",
      currency: "BRL",
      provider: "brapi" as const,
      providerSymbol: symbol,
    }));
  }

  async getDividends(
    ref: InstrumentRef,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<DividendRecord[]> {
    const result = await this.fetchQuote(ref, ctx, { dividends: "true" });
    const cash =
      (result.dividendsData as { cashDividends?: Record<string, unknown>[] } | undefined)
        ?.cashDividends ?? [];
    return cash
      .map((row) => ({
        exDate: String(row.lastDatePrior ?? row.paymentDate ?? "").slice(0, 10),
        paymentDate: row.paymentDate ? String(row.paymentDate).slice(0, 10) : null,
        amount: String(row.rate),
        currency: "BRL",
      }))
      .filter((row) => row.exDate >= from && row.exDate <= to);
  }

  async getSplits(
    ref: InstrumentRef,
    from: string,
    to: string,
    ctx?: RequestContext,
  ): Promise<SplitRecord[]> {
    const result = await this.fetchQuote(ref, ctx, { dividends: "true" });
    const stock =
      (result.dividendsData as { stockDividends?: Record<string, unknown>[] } | undefined)
        ?.stockDividends ?? [];
    return stock
      .map((row) => ({
        date: String(row.lastDatePrior ?? "").slice(0, 10),
        numerator: String(row.factor ?? 1),
        denominator: "1",
      }))
      .filter((row) => row.date >= from && row.date <= to);
  }
}
