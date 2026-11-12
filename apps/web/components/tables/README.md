# tables

Tables that show a resource the same way everywhere.

| Component | Role |
| --- | --- |
| `transactions/transactions-table.tsx` | The `/transactions` table: URL-driven filters, sorting and paging, toolbar. |
| `transactions/scoped-transactions-table.tsx` | The same columns and row rendering for a **fixed scope** (a card, an invoice, a month) with its own page and sort state, as a plain `PageSection` (title, optional `divider`; no card) with loading, error and empty states. Pass `filters` (memoized: it is the query key). `scopeEmpty` shows the empty state without a request when the scope matches nothing. |

Row rendering lives in `transactions/transactions-table.config.tsx`; change a column there and every table follows. Where a
page needs "the transactions of X", use `ScopedTransactionsTable` (or `credit-cards/card-purchases-table.tsx`, which loads
the lookups first); never draw a list of transactions by hand.

Each table also has a **mobile list** (below `md`): `getTransactionsMobileRow` in the same config file, passed as
`DataTable mobile`. Change the row there and every transactions list follows. See
[components/lists](../lists/README.md).
