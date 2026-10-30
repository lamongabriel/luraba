# Investments — progress

## Done
- Discovery (DISCOVERY.md)

## In progress
- Phase 1: schema, migrations, seeds; pure engine in `packages/domain/src/investments`

## Next
Phases 2–11 per the task brief.

## Update: API backend (phases 3-7)

Done: accounts/portfolios/settings, assets, events (with oversell protection), cash movements,
positions, dashboard, income, taxes, allocation/rebalance, holdings-at, providers and refresh,
mounted at `/api/v1/investments`. An end-to-end HTTP test covers deposit, buy, split, dividend,
sale, P&L, cash and tax. Still open: import/export endpoints, worker jobs, web UI, hardening.
