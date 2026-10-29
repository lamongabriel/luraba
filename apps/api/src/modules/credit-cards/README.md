# credit-cards

Cards, billing cycles (`credit-card-cycle-engine.ts` computes them), purchases with installments, payments and the forecast.

## Rules

Split by aggregate: cycles, purchases and payments each have a service. Purchases and payments also create transactions and ledger entries, so write them inside one `db.transaction`. Card images attach through the `credit_card` target.

## Month overview

`GET /credit-cards/overview?month=YYYY-MM` (`credit-card-overview.service.ts`) feeds the web overview. For each card it
syncs cycles, extends them until one is due in the month (at most 24 months ahead), and returns the invoice **due in that
month** plus the limit breakdown from `buildLimitBreakdown` (`@luraba/domain`): closed invoice, open invoice, future
installments, available. Totals are grouped per currency. `GET .../cycles/:cycleId` also returns the `payments` applied to
that invoice.

General module conventions: [../README.md](../README.md).
