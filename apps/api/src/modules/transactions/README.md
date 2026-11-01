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
