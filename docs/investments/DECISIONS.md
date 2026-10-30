# Investments — decisions

Format: **decision** — why — alternative. Items marked ⚠ VERIFY are legal/tax values seeded as
data (never code constants) and must be checked against current legislation before relying on them.

## Architecture
- **D-01 No i18n framework** — the web app stores `language` in preferences but has no translation
  layer; inventing one is out of scope. UI strings are English, kept as plain literals in the
  investments components, and BR terms (preço médio, proventos, JCP, aporte…) appear as secondary
  labels where they are the correct term. Alternative: next-intl.
- **D-02 Pure engine in `@luraba/domain/investments`** — framework-free, decimal.js, shared by API,
  worker and web. Alternative: a new package (more wiring, no benefit).
- **D-03 decimal.js** for all quantity/price/rate maths; DB `NUMERIC(38,18)` quantities,
  `NUMERIC(38,10)`-or-wider prices, `NUMERIC(24,12)` rates. Wire format: decimal strings.
- **D-04 Money bridge** — the app stores money as integer minor units. Investment events keep exact
  decimals; account valuation and anything feeding net worth/dashboards is converted to minor units
  with half-up rounding at the edge (`toMinor`). Cash legs that touch other accounts (deposit,
  withdrawal, transfer) are real transfer transactions so existing balances stay correct.
- **D-05 Investment account value** — for `type=investment` accounts with settings, the account
  `balance` shown in the app is cash (all currencies, via FX) + market value of positions, in the
  account base currency. The double-entry ledger still holds the external flows. Alternative: post
  every trade to the ledger (rejected: positions are not cash and need valuation over time).
- **D-06 Asset catalog is global + household custom** — `assets.household_id` is null for the shared
  catalog, set for custom assets; so it does not extend `HouseholdScopedRepository` (rule 2 exception,
  documented in the module README).
- **D-07 Market-data order** configured in `config/market-data.ts` like FX; per-household overrides
  stored in `market_data_provider_settings` (encrypted key, priority, enabled, premium flag).
- **D-08 PTAX** — BR tax on foreign assets uses the BRL conversion at the event date through
  `fxService` (Frankfurter/Yahoo, not official BCB PTAX). Documented limitation. Alternative: add a
  BCB PTAX FX provider.

## Seeded fiscal data (all ⚠ VERIFY)
Seeded in migration `0043`: IR regressive table (22.5/20/17.5/15), IOF 30-day table, 15% stock swing
with R$20,000 monthly sales exemption, 20% day trade, FII 20%, ETF 15%, BDR 15%, IRRF dedo-duro
0.005% / 1%, JCP IRRF 15%, dividend withholding 10% above R$50,000/month (Lei 15.270/2025, from
2026), custody fee 0.20% a.a., offshore flat 15% (Lei 14.754/2023), US NRA dividend 30%, US
long-term threshold 1 year, DARF code 6015, B3 holiday calendar 2000–2035 (generated from the Easter
algorithm plus fixed holidays; ⚠ extra one-off closures are not included).

## D-09 Price freshness
Quotes are cached durably in `asset_quotes` (and daily closes in `price_history`), the same shape as
the FX cache. A read serves the cached value immediately; stale quotes of open markets are refreshed
in the background (never awaited) and the dashboard reports `priceFreshness.refreshing` so the UI
refetches. A repeatable BullMQ job (`market-data` queue, every 5 min) refreshes every held asset
whose market is open; weekends and closed markets are skipped. Without `REDIS_URL` the same jobs
run on in-process timers. The consumer lives in the API process (like the import worker) because
it reuses the market-data layer. A separate Redis hot cache was rejected: a primary-key lookup in
Postgres is as fast as the network hop to Redis and adds an invalidation problem.
