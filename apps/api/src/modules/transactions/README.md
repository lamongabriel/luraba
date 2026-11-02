# transactions

The unified transaction feed (transactions, card installments, card payments), analytics, and the "upcoming" feed that merges future installments, bills and split installments.

**Analytics are cash flow.** `include_in_budget` never changes money in, money out, net or the expense breakdown (it is a budgeting flag; filter on it explicitly with `includeInBudget`).

## Rules

`transactions.linked.ts` is the shared way for other modules to show or validate a transaction they link to (`loadLinkedTransactions`, `requireLinkedTransaction`; goals use it; bills and splits still have their own copies).

Large service; helpers live in `transactions.helpers.ts`. Its repository is function-style (older code), not a class. Receipts and product photos are attachments (`transaction` target, roles `receipt`, `product`, `document`).

## Items

A transaction can optionally list what it bought: `GET/PUT /transactions/:id/items` (`transaction-items.service.ts`). `PUT` replaces the whole list atomically and needs `transactions.create`. `transaction_items` has no household column; it is reached through the transaction, which is checked against the household first, and product ids are validated against the household. Each item snapshots `name` and `unit_price` (minor units, the transaction's currency) and optionally links a product. `saveAsProductPrice` writes the price back to the product, or creates the product by name, in the same database transaction. Credit-card purchases use the purchase's `transactionId`.

General module conventions: [../README.md](../README.md).

## Invoice scope

`billingCycleIds` on the list filters keeps only credit card installments on those invoices (billing cycles); the feed
carries `billing_cycle_id` (null on standard rows). The credit card pages use it to list a month's or an invoice's
purchases with the regular transactions table.

## What the list shows

`GET /transactions` returns rows whose posted date is today (household time zone) or earlier. A credit card
installment lands on the purchase date (installment 1, so a one-time purchase shows the day it was made) or, for
installments 2..n, on the 1st of the month `installmentNumber - 1` months after the purchase month
(`installmentPostedDate` in `transactions.query.ts`): a Jan 15 purchase in 6 installments is Jan 15, Feb 1, Mar 1,
Apr 1, May 1, Jun 1, so on the 1st a month's plan total is already visible. Its invoice's closing and
due dates are not used for listing, sorting or `dateFrom`/`dateTo`; they live on the invoice
(`/credit-cards/:id/cycles`). Later installments appear in `GET /transactions/upcoming` until their day.
A query scoped with `billingCycleIds` (the invoice view) is not clamped to today, so an invoice lists all of its
installments, including those that land in future months. Analytics, the monthly summary and the upcoming rail
use the same posted date, so a purchase counts in the month it was made. Rows created through an API key or the MCP
server use the same endpoints as the web form and are listed the same way.

## Refunds, cancellations, chargebacks and cashback

Money that comes back without a source account is a `refund` transaction (`transaction_type` value) with a
detail row in `transaction_refunds` (`reason`: refund, cancellation, chargeback, cashback; optional
`original_transaction_id`; for a card, `credit_card_id` and the `billing_cycle_id` of its posted date).
Create one with `POST /transactions` (`type: "refund"`, exactly one of `accountId` / `creditCardId`);
`transactions.refunds.service.ts` validates and writes it. Cancelling a card purchase is
`POST /credit-cards/:id/purchases/:purchaseId/cancel` (see the credit-cards README).

- **Ledger:** the target (a bank account, or the card's own ledger account) gets `+amount`, the system expense
  ledger `-amount`. A card refund therefore lowers what is owed and restores the available limit; an account
  refund raises the balance. The target entry carries the category and a `budgetMonth` (the posted month).
- **Not income, not a payment:** it is never `income` and never a card payment (those move money from an
  account). Income totals ignore it.
- **Netting:** it is negative spending in its category. The list summary's `expenseAmount`, analytics (`moneyOut`
  goes down, `net` up, the expense breakdown is signed), budget actuals (`listMonthActuals` signs `refund`
  rows), the account insights and the MCP spending report all net it. A refund of an installment purchase is
  recognised in the month of the refund; the installments are recognised on their own dates, so a single credit
  of a plan that has not fully posted yet shows as a temporary negative until the later installments post.
- **Caps and defaults:** with `originalTransactionId` the amount cannot exceed what is left to refund (a card
  purchase counts its full amount across installments), the category and merchant default to the original's, and
  a card purchase can only be refunded to its own card.
- **Invoices:** `syncCardCycles` subtracts a cycle's credits from its statement (never below zero). The invoice
  view lists them apart from purchases (`credits` on the cycle details) and the feed carries `billing_cycle_id`
  for them, so `billingCycleIds` shows them.
- **Edits:** only metadata (description, merchant, tags, `includeInBudget`); amount, account, category and date are
  fixed (delete and record again). Deleting a card credit puts the amount back on the invoice.

## Competency month

An income or expense can carry a `competencyMonth` (`YYYY-MM`, `transactions.competency_month`, set on create and
update): the month the money belongs to when that differs from the month it was posted. It is not shown in the
feed; the monthly plan ([../monthly-plans/README.md](../monthly-plans/README.md)) reads it. When it is not set,
the plan applies a rule to salary only (see there).
