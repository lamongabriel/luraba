# Investments components

Shared UI for the Investments area (`app/(app)/investments/*`). Read
[`components/display/README.md`](../display/README.md) first: assets, transaction types, accounts and
money are shown with the display components, never hand-rendered.

## Data layer

| Layer | File |
| --- | --- |
| Service (thin `requestContract` calls, file downloads) | `services/investments.service.ts` |
| Queries + `investmentQueryKeys` | `queries/investments/use-investments-queries.ts` |
| Mutations (every one invalidates `investmentQueryKeys.all` and the generic accounts keys) | `mutations/investments/use-investments-mutations.ts` |

Types come from `@luraba/contracts`; the web app never redefines them.

## Freshness

Prices are cached by the API and refreshed by a scheduled job. The dashboard query serves cached
quotes at once and, while `priceFreshness.refreshing` is true, polls every `REFRESHING_POLL_MS`
(`useInvestmentDashboardQuery`). `FreshnessBadge` shows the age of the oldest price and a manual
refresh.

## Numbers

- Aggregated amounts (positions, dashboard, income, taxes) are **integer minor units** in the
  reporting currency: show them with `AmountDisplay`.
- Quantities, unit prices and rates are **exact decimal strings**. Show them with `useInvestmentFormat`
  (`quantity`, `unitPrice`, `percent`); edit them with `ExactNumberField`, which keeps the string
  instead of a float. Percent fields from the API are already in percent units.
- Fixed-income rates are stored as a fraction (`1.10`); people type percent (`110`). Use
  `percentToFraction` / `fractionToPercentText`.

## Components

| Component | Purpose |
| --- | --- |
| `PositionsTable` | Sortable holdings table (value or net-of-tax value) |
| `PerformanceChart`, `AssetPriceChart` | Portfolio value vs invested vs benchmark; price with buy/sell markers and average cost |
| `AllocationChart`, `AllocationTargetsEditor` | Donut by dimension; per-bucket target percentages with drift |
| `FreshnessBadge` | Age of prices, spinner while refreshing, refresh button |
| `ScopeBar` + `useInvestmentScope` | URL-backed portfolio / account / net switch shared by the pages |
| `MetricCard`, `PercentChange`, `SegmentedControl` | Small building blocks |
| `EventsTable`, `LotsTable`, `ApuracaoTable`, `UsGainsTable` | Ledger, open lots, Brazilian monthly assessment, US lot gains |
| `FixedIncomePanel` | Curve vs market value, IR/IOF countdown, projection to maturity |
| `CorporateActionSuggestions` | Splits and dividends reported by providers; confirming records the event |
| `AssetPicker` | Catalog combobox plus a provider lookup that imports the asset on selection |
| `ImportWizard`, `ExportPanel` | Preview-then-commit statement import; CSV/JSON export |
| `ProviderCard` | Market-data provider switch, priority and API key |
| `forms/*` | `EventForm` (every transaction type, driven by `event-form-config.ts`), `CashMovementForm`, `AccountForm`, `PortfolioForm`, `AssetForm` (+ `FixedIncomeTermsFields`), `ManualPriceSheet`, `DarfPaidSheet`, `InvestmentSettingsForm` |

## Adding a transaction type

1. Add it to the contracts and domain enums (parity is tested).
2. Add its label, icon and tone to `INVESTMENT_EVENT_TYPE_DISPLAY` in `components/display/constants.ts`
   (TypeScript forces it).
3. Add its inputs to `EVENT_FIELDS` / `EVENT_TYPE_GROUPS` in `forms/event-form-config.ts`.

## Adding an asset class

Add it to `ASSET_CLASS_DISPLAY` (label, icon, color, group). Classes in the `fixed_income` group get the
fixed-income terms form and panel automatically.

## Tax figures

Tax values are estimates built from data flagged "verify". Every tax screen shows `TAX_DISCLAIMER`
or the report's own disclaimer.

Tests: `__tests__/format.test.ts`.
