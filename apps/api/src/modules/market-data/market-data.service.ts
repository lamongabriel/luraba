import { addIsoDays, type Dec, d } from "@luraba/domain";
import { env } from "@/config/env";
import {
  MARKET_DATA_PROVIDER_IDS,
  QUOTE_TTL_CLOSED_SECONDS,
  QUOTE_TTL_OPEN_SECONDS,
} from "@/config/market-data";
import {
  decryptIntegrationSecret,
  encryptIntegrationSecret,
} from "@/modules/integrations/integration-crypto";
import { marketDataRegistry, marketDataRouter } from "./market-data.providers";
import type { MarketDataRegistry } from "./market-data.registry";
import { type AssetRecord, marketDataRepository, type QuoteRecord } from "./market-data.repository";
import type { MarketDataRouter, RouteOptions } from "./market-data.router";
import type {
  AssetCandidate,
  Candle,
  DividendRecord,
  Fundamentals,
  InstrumentRef,
  MacroPoint,
  MacroSeriesId,
  MarketDataProviderId,
  Quote,
  RequestContext,
  SplitRecord,
  TreasuryPrice,
} from "./market-data.types";

/** Opening hours by market, local time. Only used to pick the cache TTL, not to gate requests. */
/** Days per macro request: big enough to be few calls, small enough for the BCB to answer fast. */
const MACRO_WINDOW_DAYS = 730;
/** The BCB answers slowly at times; macro sync is a background job, so it can wait. */
const MACRO_TIMEOUT_MS = 40_000;

function minIso(a: string, b: string): string {
  return a < b ? a : b;
}

const MARKET_HOURS: Record<string, { timeZone: string; open: number; close: number }> = {
  BR: { timeZone: "America/Sao_Paulo", open: 10 * 60, close: 18 * 60 },
  US: { timeZone: "America/New_York", open: 9 * 60 + 30, close: 16 * 60 },
};

export function isMarketOpen(country: string | null | undefined, at: Date = new Date()): boolean {
  const hours = MARKET_HOURS[country ?? "US"] ?? MARKET_HOURS.US;
  if (!hours) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: hours.timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  if (weekday === "Sat" || weekday === "Sun") return false;
  const minutes =
    (Number(parts.find((p) => p.type === "hour")?.value) % 24) * 60 +
    Number(parts.find((p) => p.type === "minute")?.value);
  return minutes >= hours.open && minutes <= hours.close;
}

export function quoteTtlSeconds(country: string | null | undefined, at: Date = new Date()): number {
  return isMarketOpen(country, at) ? QUOTE_TTL_OPEN_SECONDS : QUOTE_TTL_CLOSED_SECONDS;
}

export type PriceInfo = {
  price: Dec;
  currency: string;
  asOf: Date;
  provider: string;
  isDelayed: boolean;
  isManual: boolean;
  change: Dec | null;
  changePercent: Dec | null;
};

export function instrumentRef(
  asset: AssetRecord,
  providerSymbols: Record<string, string> = {},
): InstrumentRef {
  return {
    symbol: asset.symbol,
    market: asset.country ?? "US",
    exchange: asset.exchange,
    assetClass: asset.assetClass,
    currency: asset.currencyId,
    providerSymbols,
  };
}

const ENV_KEYS: Partial<Record<MarketDataProviderId, string | undefined>> = {
  alphavantage: env.marketData.alphaVantageApiKey,
  brapi: env.marketData.brapiToken,
};

export class MarketDataService {
  constructor(
    private readonly router: MarketDataRouter = marketDataRouter,
    private readonly registry: MarketDataRegistry = marketDataRegistry,
    private readonly repository = marketDataRepository,
  ) {}

  /** Per-household routing: preferred order, disabled providers and the API key to use. */
  async routeOptions(householdId: string | null): Promise<RouteOptions> {
    const settings = householdId ? await this.repository.listProviderSettings(householdId) : [];
    const preferred = settings
      .filter((s) => s.priority !== null && s.enabled)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      .map((s) => s.providerId as MarketDataProviderId);
    const disabled = new Set(
      settings.filter((s) => !s.enabled).map((s) => s.providerId as MarketDataProviderId),
    );
    const byProvider = new Map(settings.map((s) => [s.providerId, s]));
    return {
      preferred,
      disabled,
      contextFor: (id): RequestContext | undefined => {
        const own = byProvider.get(id);
        let apiKey = ENV_KEYS[id];
        if (own?.apiKeyEncrypted) {
          try {
            apiKey = decryptIntegrationSecret(own.apiKeyEncrypted);
          } catch {
            apiKey = ENV_KEYS[id];
          }
        }
        const premium =
          own?.premium ?? (id === "alphavantage" ? env.marketData.alphaVantagePremium : false);
        return { apiKey, premium };
      },
    };
  }

  private toInfo(row: QuoteRecord): PriceInfo {
    return {
      price: d(row.price),
      currency: row.currencyId,
      asOf: row.asOf,
      provider: row.provider,
      isDelayed: row.isDelayed,
      isManual: row.isManual,
      change: row.change === null ? null : d(row.change),
      changePercent: row.changePercent === null ? null : d(row.changePercent),
    };
  }

  /** Latest known price: the cached quote, topped up from the latest stored daily price. */
  async latestPrices(assets: AssetRecord[]): Promise<Map<string, PriceInfo>> {
    const quotes = await this.repository.getQuotes(assets.map((a) => a.id));
    const result = new Map<string, PriceInfo>();
    for (const asset of assets) {
      const quote = quotes.get(asset.id);
      const latest = await this.repository.getLatestPrice(asset.id);
      const quoteInfo = quote ? this.toInfo(quote) : undefined;
      const stored = latest
        ? {
            price: d(latest.close),
            currency: asset.currencyId,
            asOf: new Date(`${latest.date}T21:00:00Z`),
            provider: latest.source,
            isDelayed: latest.source !== "manual",
            isManual: latest.source === "manual",
            change: null,
            changePercent: null,
          }
        : undefined;
      // Manual price wins when it is the newest; otherwise the freshest of quote and stored price.
      const candidates = [quoteInfo, stored].filter((c): c is PriceInfo => c !== undefined);
      if (candidates.length === 0) continue;
      candidates.sort(
        (a, b) => b.asOf.getTime() - a.asOf.getTime() || Number(b.isManual) - Number(a.isManual),
      );
      result.set(asset.id, candidates[0] as PriceInfo);
    }
    return result;
  }

  /** Fetches (or reuses) a quote and stores it. */
  async refreshQuote(
    householdId: string | null,
    asset: AssetRecord,
    force = false,
  ): Promise<PriceInfo | null> {
    const cached = await this.repository.getQuote(asset.id);
    if (cached && !cached.isManual && !force) {
      const age = (Date.now() - cached.fetchedAt.getTime()) / 1000;
      if (age < quoteTtlSeconds(asset.country)) return this.toInfo(cached);
    }
    const symbols = (await this.repository.providerSymbols([asset.id])).get(asset.id) ?? {};
    const ref = instrumentRef(asset, symbols);
    const options = await this.routeOptions(householdId);
    const { value: quote } = await this.router.run(
      "quote",
      ref.market,
      (provider, ctx) => provider.getQuote?.(ref, ctx) as Promise<Quote>,
      {
        ...options,
        coalesceKey: `${asset.id}`,
      },
    );
    if (cached?.isManual && cached.asOf > quote.asOf) return this.toInfo(cached);
    await this.repository.upsertQuote({
      assetId: asset.id,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      currencyId: quote.currency,
      asOf: quote.asOf,
      provider: quote.provider,
      isDelayed: quote.isDelayed,
      isManual: false,
    });
    return {
      price: d(quote.price),
      currency: quote.currency,
      asOf: quote.asOf,
      provider: quote.provider,
      isDelayed: quote.isDelayed,
      isManual: false,
      change: quote.change === null ? null : d(quote.change),
      changePercent: quote.changePercent === null ? null : d(quote.changePercent),
    };
  }

  /** A manual price is stored as a manual daily price and as the quote when it is the newest. */
  async setManualPrice(asset: AssetRecord, date: string, price: string): Promise<void> {
    await this.repository.upsertPrices(
      asset.id,
      [{ date, open: price, high: price, low: price, close: price }],
      "manual",
    );
    const quote = await this.repository.getQuote(asset.id);
    const asOf = new Date(`${date}T21:00:00Z`);
    if (!quote || quote.asOf <= asOf) {
      await this.repository.upsertQuote({
        assetId: asset.id,
        price,
        currencyId: asset.currencyId,
        asOf,
        provider: "manual",
        isDelayed: false,
        isManual: true,
      });
    }
  }

  /** Daily history for charts and valuation; fetches only the ranges not stored yet. */
  async ensureHistory(
    householdId: string | null,
    asset: AssetRecord,
    from: string,
    to: string,
  ): Promise<void> {
    const coverage = await this.repository.getCoverage(asset.id);
    const today = new Date().toISOString().slice(0, 10);
    const wanted = to > today ? today : to;
    const gaps: [string, string][] = [];
    if (!coverage.min || !coverage.max) {
      gaps.push([from, wanted]);
    } else {
      if (from < coverage.min) gaps.push([from, addIsoDays(coverage.min, -1)]);
      // Skip the tail when the stored data already reaches the last weekday.
      const lastWeekday = previousWeekday(wanted);
      if (coverage.max < lastWeekday) gaps.push([addIsoDays(coverage.max, 1), wanted]);
    }
    if (gaps.length === 0) return;
    const symbols = (await this.repository.providerSymbols([asset.id])).get(asset.id) ?? {};
    const ref = instrumentRef(asset, symbols);
    const options = await this.routeOptions(householdId);
    for (const [start, end] of gaps) {
      if (start > end) continue;
      const { value, provider } = await this.router.run(
        "history",
        ref.market,
        (p, ctx) => p.getHistory?.(ref, start, end, ctx) as Promise<Candle[]>,
        options,
      );
      await this.repository.upsertPrices(asset.id, value, provider);
    }
  }

  async search(householdId: string | null, query: string, market = "*"): Promise<AssetCandidate[]> {
    const options = await this.routeOptions(householdId);
    const { value } = await this.router.run(
      "search",
      market,
      (p, ctx) => p.search?.(query, ctx) as Promise<AssetCandidate[]>,
      options,
    );
    return value;
  }

  async fundamentals(householdId: string | null, asset: AssetRecord): Promise<Fundamentals | null> {
    const symbols = (await this.repository.providerSymbols([asset.id])).get(asset.id) ?? {};
    const ref = instrumentRef(asset, symbols);
    try {
      const { value } = await this.router.run(
        "fundamentals",
        ref.market,
        (p, ctx) => p.getFundamentals?.(ref, ctx) as Promise<Fundamentals>,
        await this.routeOptions(householdId),
      );
      return value;
    } catch {
      return null;
    }
  }

  async suggestedCorporateActions(
    householdId: string | null,
    asset: AssetRecord,
    from: string,
    to: string,
  ) {
    const symbols = (await this.repository.providerSymbols([asset.id])).get(asset.id) ?? {};
    const ref = instrumentRef(asset, symbols);
    const options = await this.routeOptions(householdId);
    const [dividends, splits] = await Promise.all([
      this.router.run(
        "corporateActions",
        ref.market,
        (p, ctx) => p.getDividends?.(ref, from, to, ctx) as Promise<DividendRecord[]>,
        options,
      ),
      this.router.run(
        "corporateActions",
        ref.market,
        (p, ctx) => p.getSplits?.(ref, from, to, ctx) as Promise<SplitRecord[]>,
        options,
      ),
    ]);
    return { dividends: dividends.value, splits: splits.value };
  }

  /** Pulls a macro series into `macro_index_values` for the missing tail (or all, when empty). */
  async syncMacro(series: MacroSeriesId, from: string, to: string): Promise<number> {
    const range = await this.repository.getMacroRange(series);
    const start = range.max && range.max >= from ? addIsoDays(range.max, 1) : from;
    if (start > to) return 0;
    // Long daily series time out as one request, so pull them in short windows and store each
    // one as it arrives: a failure keeps what was already saved and the next run resumes there.
    let stored = 0;
    for (let windowStart = start; windowStart <= to; ) {
      const windowEnd = minIso(addIsoDays(windowStart, MACRO_WINDOW_DAYS), to);
      const { value, provider } = await this.router.run(
        "macro",
        "BR",
        (p, ctx) => p.getSeries?.(series, windowStart, windowEnd, ctx) as Promise<MacroPoint[]>,
        { timeoutMs: MACRO_TIMEOUT_MS },
      );
      await this.repository.upsertMacro(series, value, provider);
      stored += value.length;
      windowStart = addIsoDays(windowEnd, 1);
    }
    return stored;
  }

  /** Stores the Tesouro buyback prices on the matching Tesouro assets (source `tesouro`). */
  async syncTreasuryPrices(
    assets: { id: string; tesouroTitle: string; maturityDate: string }[],
  ): Promise<number> {
    const { value } = await this.router.run(
      "fixedIncomePrices",
      "BR",
      (p, ctx) => p.getTreasuryPrices?.(ctx) as Promise<TreasuryPrice[]>,
      {},
    );
    let stored = 0;
    for (const asset of assets) {
      const row = value.find(
        (price) => price.title === asset.tesouroTitle && price.maturityDate === asset.maturityDate,
      );
      if (row?.sellPrice) {
        await this.repository.upsertPrices(
          asset.id,
          [{ date: row.date, open: null, high: null, low: null, close: row.sellPrice }],
          "tesouro",
        );
        stored++;
      }
    }
    return stored;
  }

  // ------------------------------------------------------------ provider status & settings

  async providerStatuses(householdId: string) {
    const settings = new Map(
      (await this.repository.listProviderSettings(householdId)).map((s) => [s.providerId, s]),
    );
    const health = new Map(this.registry.health().map((h) => [h.providerId, h]));
    return this.registry.list().map((meta) => {
      const own = settings.get(meta.id);
      const h = health.get(meta.id);
      return {
        id: meta.id,
        name: meta.name,
        capabilities: [...meta.capabilities],
        markets: [...meta.markets],
        freshness: meta.freshness,
        requiresApiKey: meta.requiresApiKey,
        hasApiKey: Boolean(own?.apiKeyEncrypted || ENV_KEYS[meta.id]),
        rateLimits: {
          perMinute: meta.rateLimits.perMinute ?? null,
          perDay: meta.rateLimits.perDay ?? null,
        },
        remainingToday: this.registry.limiter(meta.id)?.remainingToday() ?? null,
        enabled: own?.enabled ?? true,
        priority: own?.priority ?? null,
        premium:
          own?.premium ?? (meta.id === "alphavantage" ? env.marketData.alphaVantagePremium : false),
        health: {
          successes: h?.successes ?? 0,
          failures: h?.failures ?? 0,
          lastSuccessAt: h?.lastSuccessAt?.toISOString() ?? null,
          lastFailureAt: h?.lastFailureAt?.toISOString() ?? null,
          lastError: h?.lastError ?? null,
        },
      };
    });
  }

  async updateProvider(
    householdId: string,
    providerId: string,
    input: { enabled?: boolean; priority?: number | null; premium?: boolean; apiKey?: string },
  ) {
    if (
      !(MARKET_DATA_PROVIDER_IDS as readonly string[]).includes(providerId) ||
      !this.registry.get(providerId as MarketDataProviderId)
    ) {
      return null;
    }
    const values: Parameters<typeof this.repository.upsertProviderSettings>[2] = {};
    if (input.enabled !== undefined) values.enabled = input.enabled;
    if (input.priority !== undefined) values.priority = input.priority;
    if (input.premium !== undefined) values.premium = input.premium;
    if (input.apiKey !== undefined)
      values.apiKeyEncrypted = input.apiKey === "" ? null : encryptIntegrationSecret(input.apiKey);
    await this.repository.upsertProviderSettings(householdId, providerId, values);
    if (input.premium !== undefined)
      this.registry.applyPremium(providerId as MarketDataProviderId, input.premium);
    return (await this.providerStatuses(householdId)).find((s) => s.id === providerId) ?? null;
  }
}

function previousWeekday(date: string): string {
  let cursor = date;
  for (;;) {
    const day = new Date(`${cursor}T00:00:00Z`).getUTCDay();
    if (day !== 0 && day !== 6) return cursor;
    cursor = addIsoDays(cursor, -1);
  }
}

export const marketDataService = new MarketDataService();
