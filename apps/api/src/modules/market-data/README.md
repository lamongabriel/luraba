# market-data

Pluggable market data for investments, modelled on `modules/fx`. The domain and the UI never depend on a
vendor: they ask the service for "a quote for asset X" and the router picks a provider.

| File | Role |
| --- | --- |
| `market-data.types.ts` | Normalized DTOs (`Quote`, `Candle`, `AssetCandidate`...), the capability interfaces (`QuoteProvider`, `PriceHistoryProvider`, `SymbolSearchProvider`, `FundamentalsProvider`, `CorporateActionsProvider`, `MacroIndexProvider`, `FixedIncomePriceProvider`), `ProviderMetadata` and the typed errors (`RateLimitedError`, `PremiumRequiredError`, `SymbolNotFoundError`, `ProviderTimeoutError`, `ProviderUnavailableError`). |
| `market-data.registry.ts` | Registered providers, one `RateLimiter` each (per minute and per day token buckets), health counters. |
| `market-data.providers.ts` | The only place providers are registered (like `fx.providers.ts`). |
| `market-data.router.ts` | Picks the provider chain for (capability, market) from `config/market-data.ts`, applies household priority/disabled providers, enforces the timeout, walks the fallback chain on typed errors, logs each fallback, coalesces identical in-flight requests. |
| `market-data.service.ts` | Quote cache (short TTL while the market is open, longer after close), history gap filling (only missing ranges), manual prices, macro series sync, Tesouro prices, provider status and per-household settings. |
| `market-data.repository.ts` | Global tables (`asset_quotes`, `price_history`, `macro_index_values`) and the household `market_data_provider_settings`. Not household scoped: prices are shared. |
| `providers/` | One adapter per vendor: `yahoo`, `alpha-vantage`, `brapi`, `bcb` (SGS), `tesouro` (Tesouro Transparente), `mock` (fixtures). |

## Rules

- Vendor symbol formats live only inside adapters (`yahooSymbol`, `alphaVantageSymbol`) and in the
  `asset_provider_symbols` table, which always wins.
- Adapters throw typed errors; an HTTP 200 body that says "rate limit" (Alpha Vantage `Note` /
  `Information` / `Error Message`) is converted by the adapter, never left for the caller.
- A manual price wins when it is newer than the provider's; it never counts as history coverage.
- Config (order of providers per capability and market) is in `src/config/market-data.ts`. Swapping the
  default quote provider is an edit there (or a household priority). `MARKET_DATA_FORCE_MOCK=true` forces
  the fixture provider (CI, keyless development).
- Keys come from env (`ALPHA_VANTAGE_API_KEY`, `BRAPI_TOKEN`) or from the household settings, encrypted with
  `INTEGRATIONS_ENCRYPTION_KEY`.
- Tests: `__tests__/provider-contract.ts` is the contract every adapter passes against recorded fixtures
  (no live calls). Run `pnpm --filter @luraba/api test:unit`. See
  [docs/investments/ADDING_A_PROVIDER.md](../../../../../docs/investments/ADDING_A_PROVIDER.md).

General module conventions: [../README.md](../README.md).
