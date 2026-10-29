# bills

Recurring bills. A bill (`bills`) is a schedule; each due date is a row in `bill_occurrences`.

## Shape

- `BillsRepository extends HouseholdScopedRepository` (scoped get/create/update/delete, `listPage`).
  Occurrence methods live on the same class; occurrences have no household column, so always load
  the bill with `get(id, context)` first (the service's `requireBill`).
- State is derived, never stored: paid (`paid_at`), skipped, overdue (date passed, unresolved),
  scheduled.
- Open-ended bills keep about 90 days of occurrences, topped up by the worker (`bills.generate`).
  Finite plans (installments) create every occurrence up front. Changing the schedule or amount
  rebuilds only unresolved occurrences from today on; history is never touched.
- Reminders are sent by the worker (`apps/worker/src/bills`), deduplicated by key.
- `listUpcomingOccurrences` feeds the transactions "upcoming" feed; occurrences dated before the
  bill was created are backfilled history, not debts.
- Documents (contracts, invoices) attach through the `bill` target (role `document`).

General module conventions: [../README.md](../README.md).
