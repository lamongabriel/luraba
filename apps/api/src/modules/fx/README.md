# fx

Exchange-rate providers (`providers/`), sync (`fx.sync.ts`), cached rates (`exchange_rates`) and, on top of them,
**combined totals**: one number in the household base currency for amounts that span currencies.

## Rate sources

- `providers/frankfurter.provider.ts` (primary, no key, 5 s fetch timeout) and `yahoo-finance.provider.ts` (fallback),
  swappable behind `fx.providers.ts`. Every fetched rate is stored in `exchange_rates` as an exact fraction
  (`rate_numerator / rate_denominator`), so the app keeps working offline with the last known rate.
- `FxService.getRate` looks for the day's rate (direct, then inverted), fetches it if missing, and falls back to the
  latest stored rate on or before the day. It throws `DependencyUnavailableError` when nothing exists.
- Manual override: `household_fx_overrides` (migration 0056), one row per household and pair, managed with
  `GET/PUT /fx/overrides` and `DELETE /fx/overrides/:from/:to` (`household.update`, i.e. the owner; reading needs
  `household.read`). It wins over the market rate, in either direction (an override `BRL -> USD` also serves `USD -> BRL`,
  inverted).

## Combined totals (the rule that relaxes "never mix currencies")

The base currency is the household's `default_currency_id` (Household > Preferences). Display totals may add currencies
**only** through this module:

```ts
const fx = await buildCombinedFx(context, ["USD", "BRL"]);     // rates to the base currency + missing currencies
const combined = combineAmounts(fx, { USD: 10_001, BRL: 20_000 }); // { total | null, byCurrency }
```

- Formula: `total = round_half_away_from_zero( sum_c( amount_c / 10^p_c * rate_c * 10^p_base ) )`, where `rate_c` is
  `base per 1 unit of c` and `p` is the currency's minor-unit precision. The sum is exact (BigInt fractions) and rounded
  **once**, at the end (`combineMinorUnits` in `@luraba/domain`, shared with the web and MCP so all agree to the cent).
- The rate is the household override, else the latest market rate (cached 30 min in memory, a failure 5 min, so a
  slow or offline provider never delays a request twice). `asOf` is the oldest date among the rates used.
- A currency with no rate is listed in `missingCurrencies`; a total that includes it is `null` (never guessed) and the
  UI shows the per-currency amounts with a "rate unavailable" hint. A zero amount never needs a rate. A base currency
  with no accounts works the same: the rates only depend on the currencies being added.
- Response shape (`@luraba/contracts/fx`): `fx: { baseCurrencyCode, basePrecision, asOf, rates[], missingCurrencies[] }` and
  each figure `{ total, byCurrency[] }`. `GET /fx/rates?currencies=USD,BRL` returns the `fx` context alone, so a client
  can total a list it already has (`combineMinorUnits` in `@luraba/domain`).
- Tests reset the in-memory cache with `clearFxCombineCache()` and seed rates with `seedExchangeRate` (no provider call).

### Where totals are combined today

| Surface | Source |
| --- | --- |
| Credit cards overview KPIs | `combined` on `GET /credit-cards/overview` (invoices, paid, still to pay, limit, available) and `GET /credit-cards/insights` (month vs last month) |
| Budgets & goals "left to spend" | `combined` on `GET /monthly-plans/safe-to-spend` |
| Bills "due in the next 30 days" | `useCombinedAmount` (web) over `GET /fx/rates` |
| MCP `report_credit_cards`, `report_safe_to_spend`, `report_balances` | the same `combined` fields / `GET /fx/rates` |

Left per currency on purpose: per-card and per-account rows, the invoice charts and the insights groups
(`groups[]`), the safe-to-spend breakdown rows, goals (own currency, the monthly plan already carries its `fx`
note), investments (their own valuation/base-currency code) and budgets (one budget currency). The accounts page and the
dashboard show no cross-account total today.

General module conventions: [../README.md](../README.md).
