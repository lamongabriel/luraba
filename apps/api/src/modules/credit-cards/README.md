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

## Payment allocation (derived, never edited)

Which invoice a payment covers is **derived**, not remembered. `syncCardCycles` (`credit-card-cycles.service.ts`)
is the one function that does it, and every mutation that can change a statement or a payment already ends
with it, inside its own `db.transaction`: purchase create/update/delete, `PATCH .../installments/:id`, cancel
(both modes), refunds and credits, payment create/update/delete, cycle date edits and schedule rebuilds.
It recomputes the **whole card** with the pure `allocatePayments` (`@luraba/domain`):

1. payments ordered by posted date, then creation;
2. applied to invoices oldest due date first, each **capped at its statement** (installments minus credits);
3. only **closed** invoices (`closingDate <= today`) take payments; an open invoice's statement is still moving;
4. whatever no invoice absorbs is the card's **credit balance**: it is never attached to an invoice, and it
   settles later invoices by itself the moment they close (the next recompute picks it up).

The result is written to `credit_card_payment_allocations` (a cache that powers `payment.allocations` and
`cycle.payments`) and to `paid_amount` / `remaining_amount` / `status` of the cycles, only when it differs.
So `paid <= statement` and `sum(allocated) + creditBalance = sum(payments)` always hold; the reusable test
assertion is `assertCardAllocationInvariant` (`apps/api/src/test/card-allocations.ts`).

- **Why it broke before:** allocations were written only when a payment changed, and a payment filled
  `remainingAmount` at that moment. Editing an installment later left the old rows, so an invoice could show
  more paid than its statement and cents landed on later invoices.
- **Credit balance** is exposed as `creditBalance` on each overview card, `creditAmount` on a payment, and in
  the limit breakdown (it frees limit, open invoice first). The web shows it in the card detail panel.
- **Prepaying an open invoice** therefore shows as credit until that invoice closes, then applies on its own.
- **Repair / audit:** `POST /credit-cards/recompute-allocations` (`credit_cards.update`; body `creditCardId?`,
  `dryRun` defaults to **true**) and the MCP tool `recompute_card_allocations`. Idempotent; the dry run lists
  every invoice whose paid amount would change.
- **Backfill:** `pnpm --filter @luraba/api db:recompute-allocations [--apply] [--card <id>] [--json]`
  (`src/db/maintenance/recompute-card-allocations.ts`; built image: `node dist/db/maintenance/recompute-card-allocations.js`).
  Dry run by default. It is **not** a migration and does not run on deploy; run it once by hand after deploying
  (see PROGRESS.md for the exact steps). Cards also heal on their next read or mutation.

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

## Exact installment amounts

Card issuers round installments differently, so a purchase can be created with the amounts the invoice shows
(`createPurchase` in `credit-card-purchases.service.ts`; the rules live in `resolveInstallmentPlan`, `@luraba/domain`):

- `installmentAmounts: [..]` (1 to 60, every one above zero): each value is used as is, its length is the count and
  its sum is the purchase total. `installmentAmount` + `installmentCount` makes them all equal.
- **The installments are the source of truth.** If `amount` is sent too and differs from their sum the request is
  rejected (422), as is a `installmentCount` that differs from the list length. Nothing stores the difference.
- Without them, `amount` is split by `roundingMode`: `remainder_last` (default, the old behavior: the last
  installment takes the leftover cents), `remainder_first`, or `round_up_all` (every installment is rounded up, so the
  total becomes their sum). `installmentCount` defaults to 1.

`PATCH .../purchases/:purchaseId` takes the same fields. Installments on an invoice that already closed
(`closingDate <= today`) keep their amounts when only the total, the count or the rounding mode changes (the rest is
laid out again; a count below the closed ones is rejected); sending `installmentAmounts` replaces every amount, closed
ones included, and moving `postedDate` lays out all of them again. Text-only edits keep the amounts as they are.
`PATCH .../purchases/:purchaseId/installments/:installmentId` (`amount?`, `billingCycleId?`) edits one installment: the
purchase total, ledger entries, budget recognitions, invoice and available limit follow. Schedule rebuilds after a cycle
date edit (`rebuildSchedulesFromClosingDate`) keep the stored amounts.

## Cancelling a purchase and credits

`POST /credit-cards/:id/purchases/:purchaseId/cancel` (`transactions.create`, body `mode`, `reason`, `date?`,
`description?`) credits a purchase through `insertRefundInTransaction` (see the transactions README):

- `single_credit` (default): one credit for everything not refunded yet, on the invoice of the cancellation date,
  the way most issuers do it. The purchase and its installments stay as they were.
- `cancel_future`: first drops the installments whose invoice has not closed, shrinks the purchase (amount, count,
  its ledger entries and budget recognitions) to what was billed, then credits the billed part. The card's used
  limit shrinks with it; the category nets to zero once the credit is in.

Both refuse when nothing is left to refund. "Left" subtracts every linked money-back row, even rows paid into a bank account (a split or cashback), so the card is credited only for the remainder. A partial refund of an installment purchase is a plain `refund`
transaction (a single credit). Credits reduce the invoice statement; `GET .../cycles/:cycleId` lists them in
`credits`.
