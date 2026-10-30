# Investments module

Brazil + US investing on top of the pure engine in `packages/domain/src/investments`. The event
ledger (`investment_events`) is the only source of truth; positions, P&L, taxes and performance are
recomputed from it on every read.

| File | Role |
| --- | --- |
| `investments.repository.ts` | SQL only. Events/portfolios extend `HouseholdScopedRepository`; assets, terms, targets and DARF rows are reached through household-checked helpers (catalog assets have a null `household_id`). |
| `investments.valuation.ts` | `resolveScope`, `computeHoldings` (ledger per account + prices + FX + fixed-income accrual + estimated sale tax), `accountTotals` (10 s cache, invalidated on writes). |
| `investments.events.service.ts` | Event create/update/delete (derives gross/net/tax withholding/FX, rejects any change that would oversell by replaying the account) and cash movements (real transfer transaction when a counterpart account is given). |
| `investments.accounts.service.ts` | Settings, portfolios, investment accounts (a normal `accounts` row of type `investment` plus `investment_account_settings`). |
| `investments.assets.service.ts` | Catalog, provider symbols, fixed-income terms, manual prices, asset detail, providers, refresh. |
| `investments.reports.service.ts` | Positions, dashboard (TWR, XIRR, benchmark), income, taxes (apuração, DARF, US lots, annual), allocation, rebalance, holdings-at. |
| `investments.macro.ts` | Loads CDI/IPCA series, the ANBIMA calendar and tax rules (DB first, generated/seeded fallback). |
| `investments.fx.ts` | Wraps the FX module; missing pairs fall back to 1 and surface as a warning. |

Rules: amounts on the wire are integer minor units, quantities/prices/rates are decimal strings;
`netAmount` is always stored (the engine treats a present value as authoritative); a household
cannot change catalog assets, only add sector/industry/tags overrides.

Import/export and background jobs are documented in `docs/investments/PROGRESS.md`.
