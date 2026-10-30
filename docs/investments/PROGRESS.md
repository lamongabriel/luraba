# Investments: progress

## Built
- Domain engine (`packages/domain/src/investments`): ledger, cost basis (average/FIFO/lot), splits,
  FX, fixed-income accrual, Brazil tax (swing/day trade, FII, exemption, loss carry-forward, IR regressive,
  IOF), US lots (wash sale, short/long term), TWR/XIRR, allocation and rebalance.
- Schema and migrations 0043/0044; 40 contract endpoints; permissions.
- API: accounts, portfolios, assets, events, cash, positions, dashboard, income, taxes, allocation,
  rebalance, providers, import (5 formats), export (6 kinds), accounts/net-worth hook.
- Market data: Yahoo, Alpha Vantage, brapi, BCB, Tesouro, mock; refresh jobs, market-hours aware,
  stale-while-revalidate, daily snapshots, corporate-action suggestions, DARF and maturity reminders.
- Web: dashboard, holdings, transactions, accounts, asset + fixed-income detail, income, taxes,
  allocation, import/export, settings; shared display components (`AssetDisplay`, event type display).
- Tests: domain unit tests, parity, 12k-event scale, scenario HTTP tests, web unit tests.

## Known limitations
- Cash transfers made outside the investments module are not reflected in investment cash.
- B3 Movimentacao rows for Desdobro/Grupamento/Bonificacao are unsupported (use corporate-action events).
- B3 JCP amounts are grossed up using the rule rate.
- Some API code uses `new Date()` where the domain `now()` is preferable.
- The Yahoo symbol for IFIX is unverified.
- `households.http.test.ts` fails when SMTP is unavailable (pre-existing, unrelated).
- `transactions.analytics.http.test.ts` "future installments" hard-codes a purchase on 2026-08-10, so it fails once that date is past (pre-existing, unrelated).
- Integration files share one test DB; a rare cross-file reset race can fail a file in a full run, and it passes alone.

## Verify with a professional (legal/tax)
Seeded tax rules and rates, exemption thresholds, IOF table, DARF codes, wash-sale handling and
US withholding defaults. All flagged "verify" in the UI.

## Next steps
Bank-feed style brokerage sync, options/short positions, more B3 movement types, per-lot UI editing,
push notifications for large price moves.
