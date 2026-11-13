# Budgets UI

The **Budgets** page (`/budgets`; `/budget` and the old `/plan` redirect here): a month's category budgets, shown instead of listed.

```
header   Budgets                         [November 2026 v] [+ Add budget] [...]      (mobile: month, round +, ...)
chart    donut: how the month's budget is split across categories (flat, centered, legend with amount and share)
grid     [card] [card] [card]      3 columns desktop, 2 tablet, 1 mobile
card     (icon) Category                         [...]
         $412 of $500
         ======----  (bar, colored by status)
         $88 left                                82%
```

No KPI row, no stat tiles. The numbers live on the cards; the only summary is the split chart.

| File | Role |
| --- | --- |
| `app/(app)/budgets/page.tsx` | Queries (`useMonthlyBudgetQuery`, categories), the header (month button, "Add budget", the "..." menu), the editor sheet, the remove confirmation and the copy dialog. The month is `useMonthFilter` (`?month=`). |
| `budgets-content.tsx` | The donut (`DonutChartCard flat`, top-level limits only, a parent's limit already holds its subcategories') and the grid. |
| `budget-card.tsx` | One compact card. The whole card opens the editor; its menu has "Edit budget", "Remove budget" and the budgeted/spent subcategories (each opens its own limit). A category with spending but no limit shows "No limit" and "Set a limit". |
| `budget-layout.ts` | Chart height, the grid and the card height, shared by the page and `_loading.tsx` so the skeleton matches 1:1. |
| `budget-category-sheet.tsx` | The editor: add, set or remove a limit (`FormSheet`: a side panel on desktop, a bottom drawer on mobile). |
| `budget-settings-sheet.tsx` | Per-month credit card counting settings, from the header menu. |
| `copy-last-month-dialog.tsx` | Replaces the month's budgets with last month's, from the header menu. |
| `_loading.tsx`, `_error.tsx`, `_empty.tsx` (next to the page) | The three states. Empty means there is no expense category yet. |

Rules:

- **Order**: most used first (over budget and near the limit on top), via `filterAndSortBudgetItems`. Parents with subcategories are one card (`buildBudgetItems`); spent is its own spending plus its subcategories'.
- **Status** (`budgetStatus` in `lib/budgets.ts`): under 80% spent is "On track", 80-100% "Needs attention", above 100% "Over budget", spending with no limit "No budget". Bar colors live in `BUDGET_STATUS_DISPLAY`.
- **Currency**: a month's budget is one currency (`budgetCurrencyCode`, the API converts card and account spending into it), so the split chart and the cards share it. There is no per-currency total to combine; if one appears, use `CombinedAmountDisplay` like the credit cards page.
- **Saving**: `PUT /budgets/:month` replaces the whole month, so the editor and the remove action send everything else back unchanged (`replaceBodyWithExpense`), income budgets included. Removing is optimistic (`useSetCategoryBudgetMutation`) and rolls back with a toast.
- A parent's limit is the cap for its subcategories (the API answers 422, shown as a toast).
- Removed in the redesign (the API still serves them): in-place limit editing, status filter and sort controls, the summary band, the per-day pace, the budget-vs-spent trend and "most expensive" markers. `budgetPace`, `spendingChange`, `topSpenderRanks` and `budgetAllocation` stay in `lib/budgets.ts` (tested) for a later page.
- API behavior: [apps/api/src/modules/budgets/README.md](../../../api/src/modules/budgets/README.md).
