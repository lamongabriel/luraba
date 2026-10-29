# Budget UI

The `/budget` page: a YNAB-style monthly plan. Give every bit of income a job by planning an amount
per category, then watch spending against it.

| File | Role |
| --- | --- |
| `app/(app)/budget/page.tsx` | Month state, queries (`useMonthlyBudgetQuery`, categories), loading and error states. |
| `budget-editor.tsx` | Holds the **draft** amounts per section, the summary tiles (planned income, planned expenses, left to assign), "Copy last month", Discard and "Save budget" (one `PUT /budgets/:month`). |
| `budget-section.tsx` | One section (income or expenses): planned `MoneyInput`, spent/received and available per category, a progress bar, sub-categories under their parent, an "add category" picker. |
| `budget-card-settings.tsx` | The credit-card settings of the month (counts in: spend month / due month / month after; installments or full purchase). Each can follow the household default or be overridden for this month; saving re-counts that month's card purchases. |

Rules:

- Sections come from `BUDGET_SECTIONS` in `lib/budgets.ts`. Adding savings or investments means one
  more entry there plus the API response; the page does not change.
- Money and categories use the shared display components and `MoneyInput`, like everywhere else.
- Pure logic (ordering rows, progress, the PUT body) is in `lib/budgets.ts` with tests in
  `lib/__tests__/budgets.test.ts`. Labels for the card settings live there too and are shared with the
  household form.
- The API behavior is documented in [apps/api/src/modules/budgets/README.md](../../../api/src/modules/budgets/README.md).
