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

Both refuse when nothing is left to refund. A partial refund of an installment purchase is a plain `refund`
transaction (a single credit). Credits reduce the invoice statement; `GET .../cycles/:cycleId` lists them in
`credits`.

## Statement import and reconciled invoices

The issuer's invoice is the source of truth; a Luraba split is only a forecast until the invoice is reconciled.
Code: `statements/statement.parsers.ts` (files), `credit-card-statements.service.ts` (preview, apply, reconcile),
`credit-card-reconciliation.ts` (lock, audit, payment check, learned pattern), `@luraba/domain` `card-statements.ts`
(pure matching and pattern rules), `credit-card-allocations.ts` (the allocations seam).

- **Parsers** (`parseCardStatement`): Nubank, Inter, XP and Inter Global CSV, and OFX; the layout is detected from the
  header unless `issuer` is sent. Brazilian decimals (`1.234,56`), negatives, IOF rows and IOF refunds (an IOF line is
  paired with its refund and the pair is netted, status `netted`) and payment rows (status `payment`, ignored for the
  invoice total) are handled. **PDF is not supported** (no reliable text extraction): export CSV or OFX.
- **Matching** (`matchStatement`): a statement line is paired with a Luraba installment on the invoice by text score,
  installment number and the date; each pair becomes `matched` (same amount), `corrected` (differs by at most
  `STATEMENT_CORRECTION_TOLERANCE`, 5 cents: fixed automatically), `review` (a larger difference: never changed) or
  `missing` (a line with no installment). Luraba installments with no line are `extra` ("not on statement"). Nothing is
  guessed across installments of different purchases.
- **Apply** (`POST /credit-cards/:id/statements`, one transaction; `.../statements/preview` runs the same code and writes
  nothing): each `corrected` installment goes through `writeInstallmentChange` (purchase total, ledger, budget and limit
  follow), an audit row is written (`card_installment_audits`, source `statement`) and the cycle is recomputed
  (`syncCardCycles`, then `recomputeCardAllocations`). The file is saved in `card_statement_imports` and
  `card_statement_lines`.
- **Reconciled state**: when the recomputed invoice total equals the issuer total, `billing_cycles.reconciled_at` and
  `issuer_total` are set. `POST .../cycles/reconcile` (`month`, `issuerTotal`) does the same from a typed total, and
  `POST .../cycles/:cycleId/unreconcile` lifts it.
- **Lock rule**: editing, deleting or cancelling a purchase with an installment on a reconciled invoice is refused
  with 409 `RECONCILED_INVOICE` (`assertInvoicesUnlocked`) unless the request sends `override: true` (body, or query for
  delete). An override unlocks the invoice and writes an `override` audit row. Purchases show `locked` per installment.
- **Payment check**: a card payment within `PAYMENT_MISMATCH_TOLERANCE` (10 cents), but not equal, of an invoice total
  that is not reconciled is flagged: the payment response has `roundingMismatch {billingCycleId, difference}`, cycles
  and the overview invoice carry `roundingMismatch`, and the dashboard tile says "Rounding mismatch - import statement".
  An exact payment, a reconciled invoice or a larger difference is never flagged.
- **Learned pattern** (`GET .../rounding-patterns`): from reconciled purchases the card (and each merchant) learns where
  the issuer puts the extra cents (`first`, `last`, `middle`, `none`). `first` becomes `remainder_first`, `none`
  `round_down_all`, `last` the default, `middle` cannot be reproduced and is not applied. Create and update of a purchase
  use it when no `roundingMode` is sent (`appliedRoundingMode` and `roundingModeSource` in the response say which and
  why); an explicit `roundingMode` always wins.
- **Allocations seam**: payment allocations are never computed here. Every write calls `recomputeCardAllocations`
  (`credit-card-allocations.ts`), which today wraps `rebuildAllPaymentAllocations` (delete the card's allocations and
  replay the payments oldest first). To use the card-allocations-fix logic, change only the body of that one function.
- Endpoints: `previewStatement`, `applyStatement`, `listStatements`, `reconcileCycle`, `unreconcileCycle`,
  `installmentAudits` (`purchaseId` or `billingCycleId`), `roundingPatterns`. Typing the shorthand
  `1st installment 364.90, rest 364.88` is `parseInstallmentPlanText` (domain), used by the MCP `installmentPlan` and the
  web form.
