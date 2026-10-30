# Investments: master checklist (READ THIS AFTER EVERY STEP)

**Standing order from the user (overnight, unattended): do NOT stop, do NOT ask questions, do NOT
wrap up until every box below is checked.** Finishing a phase is not finishing the task. After each
step: re-read this file, tick what is done, start the next unchecked item. Commit after each group
(stage files by name, conventional commits). The user is asleep; the only acceptable end state is
everything built, linted, building and passing on API *and* web.

Gates for every group before ticking it: `pnpm typecheck`, `pnpm check` (no errors),
`pnpm test` (incl. `pnpm --filter @luraba/api test:integration`), `pnpm build`.

## Done
- [x] Phase 1: domain engine, schema, migration 0043, discovery/decisions docs
- [x] Phase 2: market-data layer (Yahoo, Alpha Vantage, brapi, BCB, Tesouro, Mock) + contract tests
- [x] Contracts (40 endpoints), permissions
- [x] API: accounts, portfolios, assets, events, cash, positions, dashboard, income, taxes, allocation, rebalance, providers (commit 1b88b82)

## A. Price freshness (NEW requirement)
Goal: opening the app never shows stale values. Show cached values instantly, refresh in the
background, then update the screen. Weekends/closed markets are skipped. Use Yahoo + other providers.
- [x] Worker job `investments:refresh-quotes` every 5 min (BullMQ repeatable): all assets held in any household (distinct), market-hours aware (skip closed markets/weekends), batches, respects rate limiter
- [x] Daily job: history top-up for held assets (adjusted closes, dividends, splits suggestions)
- [x] (decided: DB `asset_quotes` is the cache, see DECISIONS D-09) Redis hot cache for quotes (key per asset, TTL by market state) in front of `asset_quotes`; DB stays the durable cache
- [x] On-read freshness: `computeHoldings` serves cached quotes immediately; if any held quote older than TTL and market open, enqueue a background refresh (non-blocking) and return `refreshing: true`
- [x] Endpoint/field so UI can poll or refetch: `priceFreshness` + `refreshing`; web refetches after refresh (invalidate on job done or poll 5-10 s while refreshing)
- [x] Persist daily portfolio snapshots (job done; UI reads them later)  (`portfolio_snapshots`) so history of "my money" is a cheap read, only today's point is computed live
- [x] Tests: staleness rule, market-hours skip, job refreshes only held assets, cache hit/miss

## B. Remaining API
- [x] Optional migration 0044: benchmark assets (^BVSP, IFIX, ^GSPC), import batch + mapping tables
- [x] Accounts hook: investment account balance in the accounts list / net worth uses investment valuation
- [x] Import: app CSV, B3 Negociação, B3 Movimentação, generic CSV with mapping, JSON backup; preview + commit + dedupe + template download
- [x] Export: events, positions, income, realized, tax, backup (CSV/JSON)
- [x] Corporate-action suggestions job (splits/bonus from providers, user confirms)
- [x] Monthly apuração notification (DARF due), maturity reminders via existing notifications
- [x] Remaining worker jobs: macro sync (CDI/IPCA/Selic/IGP-M), Tesouro prices, fixed-income accrual snapshot, portfolio snapshot
- [x] More integration tests: allocation/rebalance, asset detail, fixed income (CDB 110% CDI), FIFO/specific lot, US account + FX, import round trip, permissions (viewer cannot write)
- [x] Contract/domain enum parity test; ledger checkpoint test; 10k-event performance test
- [ ] Update contracts README, apps/api/src/modules/README.md, docs/architecture.md

## C. Web app (use shared display components; read apps/web/README.md and components/display/README.md first)
- [x] Web service layer + query hooks for all investment endpoints (no redefined types)
- [x] Add investment account type entry in `ACCOUNT_TYPE_DISPLAY`; nav entry "Investments"
- [x] Shared components in `apps/web/components/investments/` (+ README): AssetDisplay, PositionTable, PerformanceChart, AllocationChart, FreshnessBadge, EventForm, AssetPicker, FixedIncomeTermsForm, TaxTable, ImportWizard, etc.
- [x] Dashboard page (value, P&L, today, TWR/XIRR, benchmark chart, allocation, movers, upcoming, freshness)
- [x] Holdings page (sortable table, net/gross toggle, by account/portfolio)
- [x] Asset detail page (chart with buy/sell markers + avg cost line, lots, events, income, fundamentals)
- [x] Fixed-income detail page (curve, market vs curve, IR/IOF countdown, projection)
- [x] Investment account page (cash per currency, events, settings, cost-basis method)
- [x] Event form (all types incl. corporate actions, cash movements, transfers)
- [x] Proventos/income page
- [x] Taxes page (apuração, DARF mark paid, US lots, annual summary, disclaimer)
- [x] Allocation + rebalance page (targets editor)
- [x] Settings page (providers, keys, priorities, defaults)
- [x] Import/export UI
- [x] Money/number/date inputs only via MoneyInput/NumberInput/DateInput; English only, American examples; a11y labels; light/dark; responsive
- [ ] Web tests where the repo has patterns; web typecheck, lint, build pass
- [x] Write apps/web/components/investments/README.md

## D. Hardening and docs
- [ ] docs/investments/README.md (user-facing), ADDING_A_PROVIDER.md kept current, DECISIONS.md additions, PROGRESS.md final (built / limitations / legal-verify list / next steps)
- [ ] Full gates green: typecheck, check, test, test:integration, build (api, web, worker)
- [ ] Apply migrations to dev DB; smoke test the app end to end in the browser
- [ ] Final commit(s); report to parent session

## Log (append one line per finished group)
- 1b88b82 API backend done.
- Group A freshness: jobs in API process (BullMQ market-data queue, timers w/o Redis), refresh-on-read, tests.
- Group B1: migration 0044 (benchmarks, import tables), import (5 formats) + export (6 kinds) + template, parser unit tests, HTTP test.
- Group B2: accounts hook (net worth), reminders, corporate-action suggestions, scenario tests (CDB, FIFO, US, allocation, permissions, isolation), parity + 12k-event scale tests, ledger lot pooling (quadratic -> linear).
- Group C1: web data layer, display components (AssetDisplay, InvestmentEventTypeDisplay), dashboard, holdings, transactions, accounts, asset + fixed-income detail, forms, income, taxes, allocation/rebalance, import/export, settings. Remaining: web tests, a11y/responsive pass, build/lint gates, docs.
