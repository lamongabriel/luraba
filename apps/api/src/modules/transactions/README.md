# transactions

The unified transaction feed (transactions, card installments, card payments), analytics, and the "upcoming" feed that merges future installments, bills and split installments.

## Rules

`transactions.linked.ts` is the shared way for other modules to show or validate a transaction they link to (`loadLinkedTransactions`, `requireLinkedTransaction`; goals use it; bills and splits still have their own copies).

Large service; helpers live in `transactions.helpers.ts`. Its repository is function-style (older code), not a class. Receipts and product photos are attachments (`transaction` target, roles `receipt`, `product`, `document`).

General module conventions: [../README.md](../README.md).
