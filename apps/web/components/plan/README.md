# components/plan

The **Budgets & goals** page (`/plan`, nav "Budgets & goals"; `/budgets`, `/budget` and `/goals` redirect to it in
`next.config.mjs`, a goal's detail page stays at `/goals/[id]` and keeps the nav item active). It answers "how
much can I still spend this month?" and puts goals, budgets and fixed bills on the same page.

```
header     Budgets & goals                                           [month selector]
section    Left to spend     per currency: [Left to spend this month] [Left for the card next month]  (KpiCards)
                             two breakdown lists (this month | next month) and the "What if I spend" line
section    Goals             list rows: this month contributed of planned, saved of target, where the money sits
section    Budgets           the existing budgets UI (components/budgets), guidance only
section    Fixed bills       unpaid occurrences, this month (overdue first) | next month
```

| File | Role |
| --- | --- |
| `app/(app)/plan/page.tsx` | One month state, `useSafeToSpendQuery`, goals and accounts queries; each section is a `DataBoundary` with its own loading, error and empty state (`_loading.tsx`, `_error.tsx`, `_empty.tsx`). |
| `left-to-spend.tsx` | `LeftToSpend` (one `CurrencyBlock` per currency) and `LeftToSpendSkeleton`. Negative figures are red with a minus and the card gets a destructive tint. |
| `what-if.tsx` | Amount + "Cash now / Credit card": cash comes out of this month's left to spend, a card purchase out of next month's left for the card (`applyPurchase` in `lib/plan.ts`). |
| `plan-goals.tsx` | Goal rows (never a table) from `useGoalsQuery` joined with the plan's `goals[]`; `AccountDisplay` shows where the money sits. |
| `plan-bills.tsx` | The unpaid bills behind the maths. |
| `plan-layout.ts` | Row heights and grids shared with the skeletons, so nothing shifts on load. |

Rules:

- The numbers come from one endpoint, `GET /monthly-plans/safe-to-spend` ([module README](../../../api/src/modules/monthly-plans/README.md)
  has the formulas and every assumption). The web never recomputes them; `lib/plan.ts` only applies a what-if.
- Currencies are never mixed or converted; each has its own block. A currency without a monthly plan shows "No plan"
  for next month instead of a number.
- The query key is nested under the goals key, so every goal mutation refreshes it; the page always refetches on open
  because bills, invoices and transactions change elsewhere.
- Budgets never change the left-to-spend figures; the section says so.
- Not verified on a phone: the app shell's top bar already overflows 13px on every page at 375px wide.
