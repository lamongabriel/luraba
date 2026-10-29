# splits

A purchase shared with people who pay you back.

## Shape

- `SplitsRepository extends HouseholdScopedRepository`. Participants (`split_participants`) and
  installments (`split_installments`) have no household column: load the split with `get` first
  (`requireSplit`), then reach children by id with the parent id in the query.
- Each participant has any number of installments with due date, amount and optional grace date.
- State is derived: received (an incoming transaction was linked, or marked by hand), skipped,
  written off, overdue after due date + grace, otherwise scheduled. Totals are computed on read.
- Participants are inserted with spaced `createdAt` values so their order is stable within one
  transaction.
- Splits send no notifications. Documents attach through the `split` target.

General module conventions: [../README.md](../README.md).
