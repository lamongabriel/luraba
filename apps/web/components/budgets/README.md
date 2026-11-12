# Budgets UI

The budgets section of the **Budgets & goals** page (`/plan`; `/budgets` and `/budget` redirect to it): a month-based, category-oriented view of the spending
plan. Pick a month, give expense categories a monthly limit, then watch spending against it.

## Page structure

The categories are the page. Nothing here is a card; everything sits on the page, separated by spacing
and hairlines.

```
header      Budgets                         [month] [Add budget] [...]
band        (ring) Remaining $X of $Y  |  Spent  |  Earned  |  Per day left  |  Projected
            ---- mt-10 ----
body  lg    [status] [sort]                                       | Budget vs spent (bars + dashed line)
            Car (parent)  [$150 left]  limit $500                 | ---------------------------
              $90 of $500 allocated to subcategories · $410 unallocated | Where the budget goes
                | Oil  $0 of [$90]                                |  (segmented bar + legend)
                | Car itself  $20 spent                           |
            Food  (a plain row, no subcategories)
body  mobile  the same list first, the rail (trend, split) below it
```

- **Summary band** (`budget-summary-band.tsx`, a `KpiStrip` with a `lead` cell): ring + remaining of the limit + status, then spent
  (change vs last month), earned (saved or overspent: this is "spent vs earned", inline), per day left, projected end of month.
- **Category list** (`category-budgets-list.tsx`, `category-budget-row.tsx`): filter and sort sit at the left of the section. A category without subcategories is a plain row. A **parent that has subcategories is one group**: a stronger parent row (limit editable in place, spent = its own spending plus its subcategories', a caption "$X of $Y allocated to subcategories · $Z unallocated") and its subcategories indented beneath it as thin rows with their own in-place limits, then a quiet "Car itself" line when the parent has direct spending. The parent is never shown twice (`buildBudgetItems` in `lib/budgets.ts`). A parent with a budget lists all its subcategories even without a budget or spending; without one, only those with a budget or spending. Rows:
  rows (taller, hover tint, `CategoryDisplay` size `md`) are name, `#1 spend` marker on the three biggest spenders, change vs last month, a status badge (left / exceeded / completed / no budget), and a thin bar
  with "spent of **limit**". **The limit is edited in place**: click it, type with `MoneyInput`, Enter or blur saves, Escape cancels; "Remove" (while editing) asks for
  confirmation. Saving uses `useSetCategoryBudgetMutation` (optimistic: the month in the cache updates, rolls back with an error toast). The sheet
  (`budget-category-sheet.tsx`) is only for adding a budget to a category that has none. No section title: the toolbar (status filter, sort) is all that sits above the list.
- "Most expensive" lives here: sort "Most spent" (default), the marker and the change; there is no separate card.
- **Rail** (`budget-aside.tsx`): a budget-vs-spent trend (last six months: spent as bars, the budget as a dashed `lineSeries`, 14rem tall) and the segmented split of the limits, both flat
  (`BarChartCard` / `SegmentedBarCard` with `flat`). Sticky on large screens.
- `budgets-content.tsx` composes them; `budgets-loading.tsx` mirrors it with the `*Skeleton` twins and `budget-layout.ts` sizes
  (every band cell and row has a fixed height, so nothing shifts when data arrives).

| File | Role |
| --- | --- |
| `budgets-section.tsx` | The section the plan page renders (`<BudgetsSection month />`): queries (`useMonthlyBudgetQuery`, `useBudgetInsightsQuery`, categories), the "Add budget" and menu actions in its `PageSection` header, the sheets and dialogs. The month comes from the page's single month selector. |
| `budgets-loading.tsx`, `budgets-error.tsx`, `budgets-empty.tsx` | The three states of the section. |
| `budget-category-sheet.tsx` | Add a budget for a category that has none (`FormSheet`). |
| `budget-settings-sheet.tsx` | Per-month credit card counting settings, opened from the header menu so they take no room on the page. |
| `copy-last-month-dialog.tsx` | Replaces the month's budgets with last month's (`ConfirmDialog`). |
| `budget-layout.ts` | Heights and grids shared by the page and `_loading.tsx`. |

Rules:

- **The page is expenses first.** The band, rows and charts are about expense categories. Income budgets are still stored and returned by the API; the page sends them back untouched when a
  category budget is saved (`replaceBodyWithExpense`), because `PUT /budgets/:month` replaces the whole month.
- **A parent's limit is the cap** for its subcategories (the API rejects subcategory limits that add up to more, with a 422 shown as a toast; the optimistic edit rolls back). Month totals count the parent only (`expenseBudgetTotal`).
- **Status** (`budgetStatus` in `lib/budgets.ts`): under 80% spent is "On track", 80-100% "Needs attention", above 100% "Over budget",
  spending with no limit "No budget". Labels and colors live in `BUDGET_STATUS_DISPLAY`; the band, rings and badges all read it.
- **Pace** (`budgetPace`): days left (today counts), the amount per remaining day and the projected end-of-month spend. Computed in the
  browser from the month's totals and today in the user's time zone; no API needed.
- **History and changes** come from `GET /budgets/:month/insights`, loaded separately: `mostExpenses` has every category with spending and
  its change vs the month before (the rows read it). If it fails, only the trend shows an error with a retry and the change column stays empty.
- Not built yet: an "include bills" switch and upcoming bills inside the budget (the API does not count bills in budget months).
- Pure logic and its tests: `lib/budgets.ts`, `lib/__tests__/budgets.test.ts`. Card settings labels live there too and are shared with the household form.
- API behavior: [apps/api/src/modules/budgets/README.md](../../../api/src/modules/budgets/README.md).
