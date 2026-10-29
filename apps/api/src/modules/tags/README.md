# tags

Household tags and their assignment to transactions. Second reference module for scoped CRUD.

## Files

- `tags.*` - CRUD, same shape as categories.
- `tags-associations.service.ts` - `validateTagIds` (rejects ids from other households) and helpers
  that read/write `transaction_tags` while preserving assignment order. Called by the transactions
  service inside its transaction (`TxClient`).

General module conventions: [../README.md](../README.md).
