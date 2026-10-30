import {
  type AssetCandidate,
  type Candle,
  type CorporateActionsProvider,
  type DividendRecord,
  type Fundamentals,
  type FundamentalsProvider,
  type InstrumentRef,
  type MacroIndexProvider,
  type MacroPoint,
  type MacroSeriesId,
  type MarketDataProvider,
  type PriceHistoryProvider,
  type ProviderMetadata,
  type Quote,
  type QuoteProvider,
  SymbolNotFoundError,
  type SymbolSearchProvider,
  type TreasuryPrice,
} from "../market-data.types";

const CATALOG: Record<
  string,
  { name: string; price: string; currency: string; market: string; assetClass: string }
> = {
  PETR4: {
    name: "Petrobras PN",
    price: "38.50",
    currency: "BRL",
    market: "BR",
    assetClass: "STOCK",
  },
  VALE3: { name: "Vale ON", price: "62.10", currency: "BRL", market: "BR", assetClass: "STOCK" },
  AAPL: { name: "Apple Inc.", price: "190.00", currency: "USD", market: "US", assetClass: "STOCK" },
  VOO: {
    name: "Vanguard S&P 500 ETF",
    price: "450.00",
    currency: "USD",
    market: "US",
    assetClass: "ETF",
  },
};

function addDays(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Deterministic fixture provider for tests and keyless development. Never calls the network. */
export class MockProvider
  implements
    MarketDataProvider,
    QuoteProvider,
    PriceHistoryProvider,
    SymbolSearchProvider,
    FundamentalsProvider,
    CorporateActionsProvider,
    MacroIndexProvider
{
  readonly metadata: ProviderMetadata = {
    id: "mock",
    name: "Mock (fixtures)",
    capabilities: [
      "quote",
      "history",
      "search",
      "fundamentals",
      "corporateActions",
      "macro",
      "fixedIncomePrices",
    ],
    markets: ["*"],
    assetClasses: "*",
    rateLimits: {},
    requiresApiKey: false,
    freshness: "eod",
    priority: 99,
  };

  constructor(private readonly now: () => Date = () => new Date("2024-06-14T20:00:00Z")) {}

  private entry(ref: InstrumentRef) {
    const entry = CATALOG[ref.symbol.toUpperCase()];
    if (!entry) throw new SymbolNotFoundError(`Mock has no ${ref.symbol}`, "mock");
    return entry;
  }

  async getQuote(ref: InstrumentRef): Promise<Quote> {
    const entry = this.entry(ref);
    return {
      symbol: ref.symbol,
      price: entry.price,
      change: "0.50",
      changePercent: "1.3158",
      currency: entry.currency,
      asOf: this.now(),
      isDelayed: true,
      provider: "mock",
    };
  }

  async getHistory(ref: InstrumentRef, from: string, to: string): Promise<Candle[]> {
    const entry = this.entry(ref);
    const base = Number(entry.price);
    const candles: Candle[] = [];
    for (let date = from, i = 0; date <= to; date = addDays(date, 1), i++) {
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (weekday === 0 || weekday === 6) continue;
      const close = (base * (1 + ((i % 7) - 3) / 100)).toFixed(4);
      candles.push({
        date,
        open: close,
        high: close,
        low: close,
        close,
        adjClose: close,
        volume: "1000",
      });
    }
    return candles;
  }

  async search(query: string): Promise<AssetCandidate[]> {
    const needle = query.toLowerCase();
    return Object.entries(CATALOG)
      .filter(
        ([symbol, e]) =>
          symbol.toLowerCase().includes(needle) || e.name.toLowerCase().includes(needle),
      )
      .map(([symbol, e]) => ({
        symbol,
        name: e.name,
        assetClass: e.assetClass,
        exchange: e.market === "BR" ? "BVMF" : "NASDAQ",
        country: e.market,
        currency: e.currency,
        provider: "mock" as const,
        providerSymbol: symbol,
      }));
  }

  async getFundamentals(ref: InstrumentRef): Promise<Fundamentals> {
    this.entry(ref);
    return {
      sector: "Mock sector",
      industry: "Mock industry",
      description: null,
      website: null,
      marketCap: null,
      dividendYield: "0.04",
      peRatio: null,
      provider: "mock",
    };
  }

  async getDividends(ref: InstrumentRef, from: string): Promise<DividendRecord[]> {
    this.entry(ref);
    return [{ exDate: from, paymentDate: addDays(from, 10), amount: "0.50", currency: null }];
  }

  async getSplits(ref: InstrumentRef): Promise<never[]> {
    this.entry(ref);
    return [];
  }

  async getSeries(series: MacroSeriesId, from: string, to: string): Promise<MacroPoint[]> {
    const monthly = series.endsWith("MONTHLY");
    const points: MacroPoint[] = [];
    for (let date = from; date <= to; date = addDays(date, monthly ? 31 : 1)) {
      const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
      if (!monthly && (weekday === 0 || weekday === 6)) continue;
      points.push({
        date: monthly ? `${date.slice(0, 7)}-01` : date,
        value: monthly ? "0.4" : "0.0413",
      });
    }
    return points;
  }

  async getTreasuryPrices(): Promise<TreasuryPrice[]> {
    return [
      {
        title: "Tesouro IPCA+",
        maturityDate: "2035-05-15",
        date: "2024-06-14",
        buyYield: "6.10",
        sellYield: "6.20",
        buyPrice: "3100.00",
        sellPrice: "3090.00",
        basePrice: "3095.00",
      },
    ];
  }
}
