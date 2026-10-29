# transactions

The unified transaction feed (transactions, card installments, card payments), analytics, and the "upcoming" feed that merges future installments, bills and split installments.

## Rules

Large service; helpers live in `transactions.helpers.ts`. Its repository is function-style (older code), not a class. Receipts and product photos are attachments (`transaction` target, roles `receipt`, `product`, `document`).

General module conventions: [../README.md](../README.md).
