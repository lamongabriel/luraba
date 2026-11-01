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

## Insights

`GET /credit-cards/insights?month=YYYY-MM` (`credit-card-insights.service.ts`, SQL in `credit-card-insights.repository.ts`)
reads every installment on invoices due between six months before and six months after the month, then computes in
`buildInsightsGroup` (pure, unit tested) one group per currency: total and previous-month total, spending by category, six
months of invoice history and the installments committed to the next six invoices. "Month" always means the invoices
**due** in it, like the overview. (Top merchants, largest charges, per-card totals and subscription detection were removed
because no page used them.)

## Credit limit

`creditLimitAmount` is required (minor units, at least 1) on create and, when sent, on update. The column keeps its `-1`
default only for rows created before the rule ("no limit": `buildLimitBreakdown` returns a null limit); no migration was
needed, the web edit form asks for a limit when it opens such a card.

## Transactions feed filter

`GET /transactions` accepts `billingCycleIds` (comma separated): only credit card installments on those invoices. The feed
exposes `billing_cycle_id` for it (null for standard rows).

General module conventions: [../README.md](../README.md).
