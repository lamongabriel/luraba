# components/bills

The **Bills** page (`/bills`) and the bill sheet/link modal used by it and `/bills/[id]` (where mark paid, skip, link a transaction, edit, pause, resume, cancel and delete live).

```
header   Bills                                   [November 2026 v] [+ Add bill]   (mobile: month and a round + on the title's row)
summary  one thin bar: paid | overdue | upcoming (by count)       "3 of 8 paid · 1 overdue"        "$1,240 left"
OVERDUE  4   (rows)
UPCOMING 3
PAID     1
ALL BILLS 7  (every bill, paused and canceled ones marked, so each stays reachable)
row      [day tile] Name / "Every month on the 3rd"                    $1,500.00 / [state chip]   [...]
```

No KPI tiles. Rows are compact lists on every screen size (they are a list of records, not a table).

| File | Role |
| --- | --- |
| `app/(app)/bills/page.tsx` | Month from `useMonthFilter`; the bills list and the month's forecast (`useBillForecastQuery({ from, to })`), grouped by state; "Mark paid" from the row menu (`useMarkOccurrencePaidMutation`). |
| `bill-row.tsx` | One row; it links to the bill. |
| `bills-month-summary.tsx` | The bar and its caption. The "left" amount is the unpaid total in the base currency (`useCombinedAmount`). |
| `bill-layout.ts` | Row, header and summary heights shared with `_loading.tsx`. |
| `bill-sheet.tsx`, `link-transaction-modal.tsx` | Create/edit form and linking a transaction to a payment. |

The state chip is `BillStateDisplay` from `components/display`. States: `_loading.tsx` (summary + a group of rows), `_error.tsx`, `_empty.tsx` (`BillsEmpty` for no bills, `BillsMonthEmpty` for a month with none due).
