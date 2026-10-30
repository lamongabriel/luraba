# Adding a market-data provider

Adding a provider is **one adapter file plus one registration line**. Nothing in the domain, the services or
the UI changes. Alpha Vantage (`apps/api/src/modules/market-data/providers/alpha-vantage.provider.ts`) is the
worked example.

## Steps

1. **Pick the capabilities.** Implement only the small interfaces the vendor supports
   (`QuoteProvider`, `PriceHistoryProvider`, `SymbolSearchProvider`, `FundamentalsProvider`,
   `CorporateActionsProvider`, `MacroIndexProvider`, `FixedIncomePriceProvider`) from `market-data.types.ts`.
2. **Declare metadata** (`ProviderMetadata`): `id`, `name`, `capabilities`, `markets` (ISO countries or `*`),
   `assetClasses`, `rateLimits` (`perMinute`, `perDay`) and optional `premiumRateLimits`, `requiresApiKey`,
   `freshness` (`realtime | delayed | eod`) and `priority`.
3. **Keep vendor symbols in the adapter.** Write a `xyzSymbol(ref)` helper that honours
   `ref.providerSymbols.xyz` (the `asset_provider_symbols` row) first and otherwise derives the vendor format
   from `ref.symbol`, `ref.market`, `ref.exchange`. Alpha Vantage: `PETR4` in Brazil becomes `PETR4.SAO`.
4. **Normalize** everything to the DTOs: prices as decimal strings, dates as `YYYY-MM-DD`, `asOf` as a `Date`.
5. **Convert failures to typed errors.** HTTP 429 / quota text -> `RateLimitedError`, paid endpoint ->
   `PremiumRequiredError`, unknown symbol -> `SymbolNotFoundError`, anything else -> `ProviderUnavailableError`.
   If the vendor answers 200 with an error body (Alpha Vantage `Note`, `Information`, `Error Message`) inspect the
   body in one function (`assertAlphaVantageBody`) before parsing. The router only falls back on typed errors.
6. **Inject the transport** (`HttpFetch`, or a client interface) in the constructor so tests use fixtures.
7. **Register it**: add the id to `MARKET_DATA_PROVIDER_IDS` and the routes in `src/config/market-data.ts`
   (where it sits in the fallback chain per capability and market), then `.register(new XyzProvider())` in
   `market-data.providers.ts`. Add env variables to `config/env.ts` and `.env.example` if it needs a key.
8. **Pass the contract.** Add recorded fixtures in `__tests__/fixtures.ts` and a `describeProviderContract({...})`
   call in `__tests__/market-data.unit.test.ts` with failing transports for each typed error it can raise.

## Skeleton

```ts
export class XyzProvider implements MarketDataProvider, QuoteProvider {
  readonly metadata: ProviderMetadata = {
    id: "xyz",
    name: "Xyz Markets",
    capabilities: ["quote"],
    markets: ["*"],
    assetClasses: "*",
    rateLimits: { perMinute: 60 },
    requiresApiKey: true,
    freshness: "delayed",
    priority: 40,
  };

  constructor(private readonly http: HttpFetch = defaultFetch) {}

  async getQuote(ref: InstrumentRef, ctx?: RequestContext): Promise<Quote> {
    const symbol = xyzSymbol(ref);
    const response = await this.http(`https://api.xyz.example/quote?s=${symbol}&key=${ctx?.apiKey}`);
    assertHttpOk(response, "xyz", symbol); // 429 -> RateLimited, 404 -> NotFound, other -> Unavailable
    const body = (await response.json()) as { last?: string };
    if (!body.last) throw new SymbolNotFoundError(`Xyz has no quote for ${symbol}`, "xyz");
    return { symbol: ref.symbol, price: body.last, change: null, changePercent: null,
      currency: ref.currency ?? "USD", asOf: new Date(), isDelayed: true, provider: "xyz" };
  }
}
```

## Switching the default provider

The default order per capability and market is data in `src/config/market-data.ts`, for example
`quote.BR = ["brapi", "yahoo", "alphavantage"]`. Reorder it to make Alpha Vantage the default, or let a household
do the same from Investments > Settings (priority, enable/disable, own API key, premium flag).
