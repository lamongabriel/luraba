import { describe, expect, it, vi } from "vitest";
import { MarketDataRegistry } from "../market-data.registry";
import { MarketDataRouteError, MarketDataRouter } from "../market-data.router";
import {
  type InstrumentRef,
  type MarketDataProvider,
  PremiumRequiredError,
  ProviderTimeoutError,
  RateLimitedError,
  SymbolNotFoundError,
} from "../market-data.types";
import {
  AlphaVantageProvider,
  alphaVantageSymbol,
  assertAlphaVantageBody,
} from "../providers/alpha-vantage.provider";
import { BcbProvider } from "../providers/bcb.provider";
import { BrapiProvider } from "../providers/brapi.provider";
import { MockProvider } from "../providers/mock.provider";
import { TesouroProvider } from "../providers/tesouro.provider";
import { type YahooClient, YahooProvider, yahooSymbol } from "../providers/yahoo.provider";
import { RateLimiter } from "../rate-limiter";
import {
  alphaVantageFixtures,
  bcbCdi,
  brapiQuote,
  fakeHttp,
  tesouroCsv,
  yahooChart,
  yahooQuote,
} from "./fixtures";
import { describeProviderContract } from "./provider-contract";

vi.mock("@/shared/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const petr4: InstrumentRef = { symbol: "PETR4", market: "BR", currency: "BRL" };
const aapl: InstrumentRef = { symbol: "AAPL", market: "US", currency: "USD" };
const ctx = { apiKey: "demo" };

const yahooClient = (overrides: Partial<YahooClient> = {}): YahooClient => ({
  quote: async () => yahooQuote,
  chart: async () => yahooChart,
  search: async () => ({
    quotes: [
      { symbol: "PETR4.SA", longname: "Petrobras", quoteType: "EQUITY", exchDisp: "Sao Paulo" },
    ],
  }),
  quoteSummary: async () => ({
    assetProfile: { sector: "Energy", industry: "Oil & Gas" },
    summaryDetail: {},
  }),
  ...overrides,
});

describeProviderContract({
  label: "mock",
  provider: new MockProvider(),
  ref: petr4,
  from: "2024-06-03",
  to: "2024-06-14",
});

describeProviderContract({
  label: "yahoo",
  provider: new YahooProvider(yahooClient()),
  ref: petr4,
  from: "2024-06-01",
  to: "2024-06-30",
  failures: [
    {
      code: "RATE_LIMITED",
      capability: "quote",
      make: () =>
        new YahooProvider(
          yahooClient({
            quote: async () => {
              throw new Error("429 Too Many Requests");
            },
          }),
        ),
    },
    {
      code: "NOT_FOUND",
      capability: "history",
      make: () =>
        new YahooProvider(
          yahooClient({
            chart: async () => {
              throw new Error("No data found, symbol may be delisted");
            },
          }),
        ),
    },
  ],
});

const avRoutes = (extra = {}) => ({
  GLOBAL_QUOTE: { json: alphaVantageFixtures.quote },
  TIME_SERIES_WEEKLY_ADJUSTED: { json: alphaVantageFixtures.weekly },
  TIME_SERIES_DAILY: { json: alphaVantageFixtures.daily },
  SYMBOL_SEARCH: { json: alphaVantageFixtures.search },
  ...extra,
});
describeProviderContract({
  label: "alphavantage",
  provider: new AlphaVantageProvider(fakeHttp(avRoutes())),
  ref: petr4,
  ctx,
  from: "2024-06-01",
  to: "2024-06-30",
  failures: [
    {
      code: "RATE_LIMITED",
      capability: "quote",
      make: () =>
        new AlphaVantageProvider(fakeHttp({ GLOBAL_QUOTE: { json: alphaVantageFixtures.note } })),
    },
    {
      code: "RATE_LIMITED",
      capability: "quote",
      make: () =>
        new AlphaVantageProvider(
          fakeHttp({ GLOBAL_QUOTE: { json: alphaVantageFixtures.information } }),
        ),
    },
    {
      code: "PREMIUM_REQUIRED",
      capability: "quote",
      make: () =>
        new AlphaVantageProvider(
          fakeHttp({ GLOBAL_QUOTE: { json: alphaVantageFixtures.premium } }),
        ),
    },
    {
      code: "NOT_FOUND",
      capability: "history",
      make: () =>
        new AlphaVantageProvider(
          fakeHttp({ TIME_SERIES_DAILY: { json: alphaVantageFixtures.error } }),
        ),
    },
    {
      code: "RATE_LIMITED",
      capability: "search",
      make: () => new AlphaVantageProvider(fakeHttp({ SYMBOL_SEARCH: { status: 429 } })),
    },
  ],
});

describeProviderContract({
  label: "brapi",
  provider: new BrapiProvider(
    fakeHttp({
      "/quote/PETR4": { json: brapiQuote },
      "/available": { json: { stocks: ["PETR4", "PETR3"] } },
    }),
  ),
  ref: petr4,
  ctx,
  from: "2024-06-01",
  to: "2024-06-30",
  failures: [
    {
      code: "RATE_LIMITED",
      capability: "quote",
      make: () => new BrapiProvider(fakeHttp({ "/quote/": { status: 429 } })),
    },
    {
      code: "PREMIUM_REQUIRED",
      capability: "quote",
      make: () => new BrapiProvider(fakeHttp({ "/quote/": { status: 402 } })),
    },
    {
      code: "NOT_FOUND",
      capability: "quote",
      make: () => new BrapiProvider(fakeHttp({ "/quote/": { json: { results: [] } } })),
    },
  ],
});

describeProviderContract({
  label: "bcb",
  provider: new BcbProvider(fakeHttp({ "bcdata.sgs.12": { json: bcbCdi } })),
  ref: petr4,
  from: "2024-06-12",
  to: "2024-06-14",
  failures: [
    {
      code: "UNAVAILABLE",
      capability: "macro",
      make: () => new BcbProvider(fakeHttp({ "bcdata.sgs.12": { status: 500 } })),
    },
  ],
});

describeProviderContract({
  label: "tesouro",
  provider: new TesouroProvider(fakeHttp({ PrecoTaxaTesouroDireto: { text: tesouroCsv } })),
  ref: petr4,
  from: "2024-06-01",
  to: "2024-06-30",
  failures: [
    {
      code: "UNAVAILABLE",
      capability: "fixedIncomePrices",
      make: () => new TesouroProvider(fakeHttp({ PrecoTaxaTesouroDireto: { status: 503 } })),
    },
  ],
});

describe("symbol mapping stays inside adapters", () => {
  it("maps B3 tickers per vendor and honours explicit mappings", () => {
    expect(yahooSymbol(petr4)).toBe("PETR4.SA");
    expect(alphaVantageSymbol(petr4)).toBe("PETR4.SAO");
    expect(yahooSymbol(aapl)).toBe("AAPL");
    expect(yahooSymbol({ ...petr4, providerSymbols: { yahoo: "PETR4.XX" } })).toBe("PETR4.XX");
    expect(alphaVantageSymbol({ symbol: "SHEL", market: "GB" })).toBe("SHEL.LON");
    expect(alphaVantageSymbol({ symbol: "000001", market: "CN", exchange: "SHZ" })).toBe(
      "000001.SHZ",
    );
  });
});

describe("Alpha Vantage 200-with-error bodies", () => {
  it("raises typed errors for Note, Information and Error Message", () => {
    expect(() => assertAlphaVantageBody(alphaVantageFixtures.note, "x")).toThrow(RateLimitedError);
    expect(() => assertAlphaVantageBody(alphaVantageFixtures.information, "x")).toThrow(
      RateLimitedError,
    );
    expect(() => assertAlphaVantageBody(alphaVantageFixtures.premium, "x")).toThrow(
      PremiumRequiredError,
    );
    expect(() => assertAlphaVantageBody(alphaVantageFixtures.error, "x")).toThrow(
      SymbolNotFoundError,
    );
    expect(() => assertAlphaVantageBody(alphaVantageFixtures.quote, "x")).not.toThrow();
  });
});

describe("Tesouro CSV", () => {
  it("returns only the latest base date with decimal commas converted", async () => {
    const prices = await new TesouroProvider(
      fakeHttp({ PrecoTaxaTesouroDireto: { text: tesouroCsv } }),
    ).getTreasuryPrices();
    expect(prices).toHaveLength(2);
    expect(prices[0]?.sellPrice).toBe("3091.25");
    expect(prices.every((row) => row.date === "2024-06-14")).toBe(true);
  });
});

function stub(
  id: "yahoo" | "alphavantage" | "brapi",
  behaviour: () => Promise<unknown>,
): MarketDataProvider {
  return {
    metadata: {
      id,
      name: id,
      capabilities: ["quote"],
      markets: ["*"],
      assetClasses: "*",
      rateLimits: {},
      requiresApiKey: false,
      freshness: "eod",
      priority: 1,
    },
    getQuote: behaviour as never,
  };
}

describe("router", () => {
  const quote = (provider: "yahoo" | "alphavantage" | "brapi") => ({
    symbol: "AAPL",
    price: "1",
    change: null,
    changePercent: null,
    currency: "USD",
    asOf: new Date(),
    isDelayed: true,
    provider,
  });
  const build = (...providers: MarketDataProvider[]) => {
    const registry = new MarketDataRegistry();
    for (const provider of providers) registry.register(provider);
    return { registry, router: new MarketDataRouter(registry, 50) };
  };
  const call = (provider: MarketDataProvider) => provider.getQuote?.(aapl) as Promise<unknown>;

  it("falls back on rate limit, premium required, timeout and generic failures", async () => {
    const { router, registry } = build(
      stub("yahoo", async () => {
        throw new RateLimitedError("slow down", "yahoo");
      }),
      stub("alphavantage", async () => quote("alphavantage")),
    );
    const result = await router.run("quote", "US", (p) => call(p));
    expect(result.provider).toBe("alphavantage");
    expect(result.attempts.map((a) => a.code ?? "ok")).toEqual(["RATE_LIMITED", "ok"]);
    expect(registry.health().find((h) => h.providerId === "yahoo")?.failures).toBe(1);

    const premium = build(
      stub("yahoo", async () => {
        throw new PremiumRequiredError("premium", "yahoo");
      }),
      stub("alphavantage", async () => quote("alphavantage")),
    );
    expect((await premium.router.run("quote", "US", (p) => call(p))).provider).toBe("alphavantage");

    const slow = build(
      stub("yahoo", () => new Promise(() => undefined)),
      stub("alphavantage", async () => quote("alphavantage")),
    );
    expect((await slow.router.run("quote", "US", (p) => call(p))).provider).toBe("alphavantage");

    const broken = build(
      stub("yahoo", async () => {
        throw new Error("boom");
      }),
      stub("alphavantage", async () => quote("alphavantage")),
    );
    expect((await broken.router.run("quote", "US", (p) => call(p))).provider).toBe("alphavantage");
  });

  it("surfaces a typed route error when every provider fails", async () => {
    const { router } = build(
      stub("yahoo", async () => {
        throw new ProviderTimeoutError("t", "yahoo");
      }),
      stub("alphavantage", async () => {
        throw new SymbolNotFoundError("nf", "alphavantage");
      }),
    );
    await expect(router.run("quote", "US", (p) => call(p))).rejects.toBeInstanceOf(
      MarketDataRouteError,
    );
  });

  it("honours household priority and disabled providers", async () => {
    const { router } = build(
      stub("yahoo", async () => quote("yahoo")),
      stub("alphavantage", async () => quote("alphavantage")),
    );
    expect(router.orderFor("quote", "US")).toEqual(["yahoo", "alphavantage"]);
    expect(router.orderFor("quote", "US", { preferred: ["alphavantage"] })).toEqual([
      "alphavantage",
      "yahoo",
    ]);
    expect(router.orderFor("quote", "US", { disabled: new Set(["yahoo"]) })).toEqual([
      "alphavantage",
    ]);
    expect(router.orderFor("quote", "BR", {})).toEqual(["yahoo", "alphavantage"]);
  });

  it("coalesces concurrent identical requests", async () => {
    let calls = 0;
    const { router } = build(
      stub("yahoo", async () => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return quote("yahoo");
      }),
    );
    await Promise.all(
      [1, 2, 3].map(() => router.run("quote", "US", (p) => call(p), { coalesceKey: "AAPL" })),
    );
    expect(calls).toBe(1);
  });

  it("skips a provider whose local limiter is exhausted", async () => {
    const limited: MarketDataProvider = {
      ...stub("yahoo", async () => quote("yahoo")),
      metadata: { ...stub("yahoo", async () => 0).metadata, rateLimits: { perDay: 1 } },
    };
    const { router } = build(
      limited,
      stub("alphavantage", async () => quote("alphavantage")),
    );
    expect((await router.run("quote", "US", (p) => call(p))).provider).toBe("yahoo");
    expect((await router.run("quote", "US", (p) => call(p))).provider).toBe("alphavantage");
  });
});

describe("rate limiter", () => {
  it("enforces per-minute refill and per-day cap with an injected clock", () => {
    let now = Date.parse("2024-06-14T12:00:00Z");
    const limiter = new RateLimiter({ perMinute: 2, perDay: 3 }, () => now);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
    now += 30_000;
    expect(limiter.tryAcquire()).toBe(true);
    now += 120_000;
    expect(limiter.tryAcquire()).toBe(false); // daily cap of 3 reached
    now += 86_400_000;
    expect(limiter.tryAcquire()).toBe(true);
  });
});
