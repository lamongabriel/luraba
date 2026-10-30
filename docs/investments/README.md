# Investments (user guide)

Track Brazilian and US investments next to your everyday finances: stocks, ETFs, BDRs, FIIs, REITs,
crypto, Tesouro Direto, CDB/LCI/LCA, debentures, US Treasuries and more.

## Concepts

- **Investment account**: a brokerage or bank account with a base currency, a cost-basis method
  (average, FIFO or specific lot) and a tax profile (Brazil individual, US resident/non-resident, none).
  It also appears in your normal accounts list, and its value counts toward net worth.
- **Portfolio**: an optional grouping of accounts (for example "Retirement").
- **Event**: everything is a dated event: deposits, buys, sells, dividends, splits, fees, fixed-income
  applications and redemptions. Positions, profit and taxes are always recomputed from events, so
  editing or deleting one corrects everything. An edit that would leave a sale uncovered is refused.
- **Asset**: from the shared catalog or created by you. Fixed-income assets carry terms (indexer, rate,
  maturity) and are valued on the accrual curve.

## Pages

Dashboard (value, profit, today, annualized return, benchmark chart, allocation, movers, upcoming),
Holdings (gross/net of estimated sale tax), Transactions, Accounts, Asset detail (price chart with your
trades, lots, income), Income, Taxes (monthly apuração, DARF, US lots), Allocation and rebalance,
Import/Export, Settings (data providers, defaults).

## Prices and freshness

Cached prices show instantly; a background job refreshes held assets every 5 minutes while their
market is open (weekends and holidays are skipped) and the page updates when it finishes. The badge
shows how old the oldest price is. Providers are tried in priority order (Yahoo first); you can add
API keys and reorder them in Settings, or enter a manual price. See `ADDING_A_PROVIDER.md`.

## Import and export

Import app CSV, B3 "Negociação" and "Movimentação" files, a generic CSV with column mapping, or a JSON
backup: upload, preview, then commit (duplicates are skipped). Export events, positions, income,
realized results, tax data or a full backup as CSV/JSON.

## Taxes: verify before relying on them

Tax rules (exemptions, rates, IOF table, DARF codes) are seeded data flagged "verify". The app estimates;
it is not tax advice.
