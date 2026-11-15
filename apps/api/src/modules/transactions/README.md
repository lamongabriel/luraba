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
detail row in `transaction_refunds` (`reason`: refund, cancellation, chargeback, cashback, split; optional
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
- **Caps and defaults:** with `originalTransactionId` the category and merchant default to the original's and the
  total of all linked rows cannot exceed the original (a card purchase counts its full amount across
  installments).
- **Invoices:** `syncCardCycles` subtracts a cycle's credits from its statement (never below zero). The invoice
  view lists them apart from purchases (`credits` on the cycle details) and the feed carries `billing_cycle_id`
  for them, so `billingCycleIds` shows them.
- **Edits:** only metadata (description, merchant, tags, `includeInBudget`); amount, account, category and date are
  fixed (delete and record again). Deleting a card credit puts the amount back on the invoice.

### Money back linked to any purchase

`originalTransactionId` may point at **any expense or card purchase**, whichever account or card receives the money
(a friend's Pix into a bank account for a card purchase, cashback into another account). One purchase can have many
linked rows. `reason: "split"` is a friend paying their share.

- **Posting is unchanged.** The money-back row keeps its own account or card, ledger entries, category, merchant and
  date. Only the link to the original is new. So a card purchase refunded to a bank account moves that account's
  balance and nothing on the card: its used limit, owed balance and invoices stay exactly as they were. (Refunded to
  the card itself it lowers the invoice and restores the limit, as before.)
- **Reports net by the money-back row, not the original.** Spending, budgets and analytics subtract the row in its own
  category (defaulted from the original) and in the month of its own date, same as a same-account refund. A Pix received
  in November for an October purchase lowers November's spending in that category; October is not rewritten.
- **Cap:** the sum of all rows linked to a purchase (`sumRefundedAgainst`, positive ledger entries) must stay within
  the original's full amount, checked on create and on link (a re-linked row does not count against itself).
- **Currency:** the money back must be in the original's currency. A mismatch is rejected (422), never converted, so
  the sums stay exact.
- **Original rules:** must exist in the household (404 otherwise) and be an expense or card purchase; a refund,
  transfer, income or adjustment is rejected (422), as is linking a row to itself.
- **Link endpoint:** `PATCH /transactions/:id/link-refund` (`transactions.update`, body `{ originalTransactionId }`,
  `null` unlinks) re-points an existing refund/cashback/split row. Only the link moves, never its amount, category or
  ledger entries, so old unlinked cashback and splits can be backfilled. `transaction_refunds` has no household
  column: the row is reached through the household-scoped transaction first.
- **Net cost on the wire:** expenses and card purchase rows (detail and list) carry `moneyBack`:
  `{ totalAmount, receivedBack, outOfPocket, entries[] }` in minor units (`totalAmount` is the whole purchase across
  installments; each entry has the reason, date, account or card and amount), computed by `attachMoneyBack` in the
  refunds service. It is `null` on every other row.
- **`cancel_purchase` with linked rows:** it credits the card only for what is left after all linked rows (the remainder
  of the purchase). A purchase with 82 received in a bank account and 188 credited by the cancellation ends fully
  covered; the card still owes the 82 that came back elsewhere, because that money is already someone else's.
- **Deleting** a linked row simply drops it from the net cost. Deleting the original sets the link to null
  (`on delete set null`), turning the row into plain unlinked money back.

## Notes and statement name

Every transaction has three text fields: `description` (the short, clean title, an English title of 40
characters or less by convention), `originalDescription` (`transactions.original_description`, max 512: the raw
statement text exactly as the bank shows it, never cleaned or translated) and `notes` (`transactions.notes`, text,
max 4000: free-form). Both new columns are nullable with no default; existing rows are untouched. They are
accepted on every create kind (expense, income, transfer, adjustment, refund, card purchase, card payment, card
cancellation) and on `PATCH /transactions/:id`, where `null` clears them. A patch that only touches these two fields
skips the account/amount/category checks, so it also works on card purchases and card payments.

- **One value per record.** A card purchase keeps them on its `transactions` row, so every installment row of the
  feed returns the purchase's values and editing them through any installment updates the purchase. A transfer is
  one row shared by both sides.
- **Search.** The list `search` (the search box, the MCP `text` filter) matches the title, `originalDescription`
  and `notes` besides the existing fields, ignoring case and accents (`buildFoldedSearch` in `shared/list.ts`
  folds both sides with `translate()`, so no `unaccent` extension is needed).
- **Imports.** The raw statement text of an imported row becomes `originalDescription`; the title defaults to it
  until the row is renamed in the review step.

## Competency month

An income or expense can carry a `competencyMonth` (`YYYY-MM`, `transactions.competency_month`, set on create and
update): the month the money belongs to when that differs from the month it was posted. It is not shown in the
feed; the monthly plan ([../monthly-plans/README.md](../monthly-plans/README.md)) reads it. When it is not set,
the plan applies a rule to salary only (see there).
