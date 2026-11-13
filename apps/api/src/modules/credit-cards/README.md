# credit-cards

Cards, billing cycles (`credit-card-cycle-engine.ts` computes them), purchases with installments, payments and the forecast.

## Rules

Split by aggregate: cycles, purchases and payments each have a service. Purchases and payments also create transactions and ledger entries, so write them inside one `db.transaction`. Card images attach through the `credit_card` target.

## Month overview

`GET /credit-cards/overview?month=YYYY-MM` (`credit-card-overview.service.ts`) feeds the web overview. For each card it
syncs cycles, extends them until one is due in the month (at most 24 months ahead), and returns the invoice **due in that
month** plus the limit breakdown from `buildLimitBreakdown` (`@luraba/domain`): closed invoice, open invoice, future
installments, available. `totals` are grouped per currency (cards' own currency) and `combined` converts them to the household base currency
(see [fx](../fx/README.md)); `combined.limitUsed` is the limit consumed across all cards. `GET .../cycles/:cycleId` also returns the `payments` applied to
that invoice.

## Insights

`GET /credit-cards/insights?month=YYYY-MM` (`credit-card-insights.service.ts`, SQL in `credit-card-insights.repository.ts`)
reads every installment on invoices due between six months before and six months after the month, then computes in
`buildInsightsGroup` (pure, unit tested) one group per currency: total and previous-month total, spending by category, six
months of invoice history and the installments committed to the next six invoices. `combined` holds the month's and last month's totals and the spending by category (`byCategory`, each category converted once across currencies) in the base currency. "Month" always means the invoices
**due** in it, like the overview. (Top merchants, largest charges, per-card totals and subscription detection were removed
because no page used them.)

## Archiving

`POST /credit-cards/:id/archive` and `/unarchive` (permission `credit_cards.update`) set or clear
`credit_cards.archived_at` (the internal ledger account is untouched). Only a card with a zero balance can be
archived (`409` otherwise); the history (purchases, invoices, payments) stays and reports still count it.
`GET /credit-cards` hides archived cards unless `includeArchived=true`. New purchases, payments and refunds to
an archived card are refused with `409` (`assertNotArchived`, see the accounts README); editing or deleting
existing records stays allowed. A bank account that owns an active card cannot be archived.

## Credit limit

`creditLimitAmount` is required (minor units, at least 1) on create and, when sent, on update. The column keeps its `-1`
default only for rows created before the rule ("no limit": `buildLimitBreakdown` returns a null limit); no migration was
needed, the web edit form asks for a limit when it opens such a card.

## Transactions feed filter

`GET /transactions` accepts `billingCycleIds` (comma separated): only credit card installments on those invoices. The feed
exposes `billing_cycle_id` for it (null for standard rows).

General module conventions: [../README.md](../README.md).

## Notes and statement name

Purchases, payments and cancellations accept `originalDescription` and `notes` (see the transactions README); the
purchase and payment responses return them, and `PATCH` of a purchase or payment can clear them with `null`. They
live on the purchase's transaction row, so all installments share them.

## Cancelling a purchase and credits

`POST /credit-cards/:id/purchases/:purchaseId/cancel` (`transactions.create`, body `mode`, `reason`, `date?`,
`description?`) credits a purchase through `insertRefundInTransaction` (see the transactions README):

- `single_credit` (default): one credit for everything not refunded yet, on the invoice of the cancellation date,
  the way most issuers do it. The purchase and its installments stay as they were.
- `cancel_future`: first drops the installments whose invoice has not closed, shrinks the purchase (amount, count,
  its ledger entries and budget recognitions) to what was billed, then credits the billed part. The card's used
  limit shrinks with it; the category nets to zero once the credit is in.

Both refuse when nothing is left to refund. A partial refund of an installment purchase is a plain `refund`
transaction (a single credit). Credits reduce the invoice statement; `GET .../cycles/:cycleId` lists them in
`credits`.
