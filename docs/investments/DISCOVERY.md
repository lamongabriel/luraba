# Investments — discovery

Findings from reading the repo before building the module (commit `9af7ec9`).

## Stack

pnpm + Turborepo monorepo. `apps/api` (Express 5, Drizzle ORM, Postgres, Better Auth, Zod 4),
`apps/web` (Next.js 16 app router, TanStack Query/Table, react-hook-form, Recharts, shadcn-style
`components/ui`), `apps/worker` (BullMQ consumers), packages `contracts` (Zod endpoint definitions),
`db` (Drizzle schemas, migrations live in `apps/api/src/db/migrations`), `domain` (framework-free
helpers), `queue`, `notifications`, `storage`. Biome for lint/format, Vitest for tests.
`decimal.js` already sat in the pnpm store; it is now a dependency of `@luraba/domain`.

## Money, accounts, ledger

- Money is an integer in minor units (`bigint`/`integer` columns, `number` in TS). `formatMoney`
  lives in `packages/domain/src/money.ts`.
- `accounts` has `type` (enum already contains `investment`, plus `crypto`, `cash`…),
  `classification` (asset/liability), `currency_id`, optional institution fields. Typed profile rows
  per type (`investment_account_profiles` holds only a `subtype`).
- Balances are never stored: a double-entry `entries` table posts to `ledger_accounts`
  (one per account, plus `system:*` accounts). Transfers between accounts create balanced entries;
  cross-currency transfers add two offshore clearing entries (`createTransferEntries`).
- Account display metadata (icon, label, color) lives in the `ACCOUNT_TYPE_DISPLAY` catalog in
  `apps/web/components/display/`.
- `HouseholdScopedRepository` (apps/api/src/shared/repositories) is the base for all
  `household_id` tables. Rows that may be global (the asset catalog) cannot use it.
- Preferences: `language` is `en | pt-BR`, but the web app has **no i18n framework** (no next-intl
  etc.); all UI strings are inline English. See DECISIONS D-01.

## FX module (reference architecture for market data)

`apps/api/src/modules/fx`:

- **Provider interface** `FxProvider` (`fx.types.ts`): `id`, `healthCheck`, `getLatestRates`,
  `getHistoricalRates`, optional `getTimeSeries`. Normalised DTO `FxProviderRate`.
- **Registration**: `fx.providers.ts` builds `fxProvidersById` (frankfurter, yahoo-finance2) and the
  ordered list `fxProviderOrder`. IDs and order are config in `src/config/fx.ts`
  (`FX_PRIMARY_PROVIDER_ID`, `FX_FALLBACK_PROVIDER_IDS`).
- **Selection / fallback**: `FxService.getRate` tries the requested provider, otherwise walks
  `fxProviderOrder`; any provider error falls through to the next; `DependencyUnavailableError` when
  all fail, `NotFoundError` when no rate exists.
- **Caching**: rates are persisted in `exchange_rates` (provider, pair, date, numerator/denominator);
  lookups check exact date then "on or before" before calling a provider; an in-process
  `rateLookupCache` coalesces concurrent lookups. `fx.sync.ts` has `syncLatestFxRates` and
  `backfillFxRates` for the worker.
- **Rate limiting**: none. The market-data layer adds token buckets (see ARCHITECTURE below).
- Rates are exact rational pairs (bigint numerator/denominator). Investments reuse `fxService`
  (`getRate`, `convert`) and never add a second FX system; decimals are derived from the rational.

## Other infrastructure

- **Imports** (`modules/imports`): ParserAdapter registry → staged `import_rows` → pure evaluator →
  per-kind `RowImporter`; idempotent through `import_records`. It models bank statements, not trade
  events, so the investments importer reuses its *shape* (preview/commit, duplicate keys) but has
  its own staging (`investment_import_batches`).
- **Exports** (`modules/exports`): registry of CSV/JSON exporters.
- **Worker** (`apps/worker`): BullMQ `Worker`s plus job schedulers (`bills.generate`, sweeps).
  `@luraba/queue` owns queue and job names. Imports run a BullMQ worker inside the API process.
- **Charts**: Recharts via `components/charts`. **Tables**: TanStack Table (`components/data-table`).
- **Routing**: `apps/web/app/(app)/<section>/page.tsx`; navigation in `components/navigation`.
- **Permissions**: `packages/contracts/src/permissions.ts` (permission constants + role map).
- **Encrypted secrets**: `INTEGRATIONS_ENCRYPTION_KEY` and `modules/integrations` (Brandfetch key)
  already encrypt third-party keys; provider API keys reuse that mechanism.

## Mapping decisions

| Need | Reuse |
| --- | --- |
| Investment account | existing `accounts.type = investment` + new `investment_account_settings` |
| Cash in/out | existing transfer transactions; event links `transaction_id` |
| Net worth | account balance override for investment accounts (cash + positions via FX) |
| FX | `fxService` only |
| Market data | new `modules/market-data` mirroring `fx` (providers, order in config, DB cache) |
| Domain maths | `packages/domain/src/investments/*` (pure, decimal.js) |
