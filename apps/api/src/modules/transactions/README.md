# transactions

The unified transaction feed (transactions, card installments, card payments), analytics, and the "upcoming" feed that merges future installments, bills and split installments.

## Rules

`transactions.linked.ts` is the shared way for other modules to show or validate a transaction they link to (`loadLinkedTransactions`, `requireLinkedTransaction`; goals use it; bills and splits still have their own copies).

Large service; helpers live in `transactions.helpers.ts`. Its repository is function-style (older code), not a class. Receipts and product photos are attachments (`transaction` target, roles `receipt`, `product`, `document`).

## Items

A transaction can optionally list what it bought: `GET/PUT /transactions/:id/items` (`transaction-items.service.ts`). `PUT` replaces the whole list atomically and needs `transactions.create`. `transaction_items` has no household column; it is reached through the transaction, which is checked against the household first, and product ids are validated against the household. Each item snapshots `name` and `unit_price` (minor units, the transaction's currency) and optionally links a product. `saveAsProductPrice` writes the price back to the product, or creates the product by name, in the same database transaction. Credit-card purchases use the purchase's `transactionId`.

General module conventions: [../README.md](../README.md).
