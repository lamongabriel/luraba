# budgets

Monthly budgets per household (`/budgets/:month`, `YYYY-MM`).

## What a month holds

- **Planned amounts** per category (`budgets` table, one row per household + month + category), for
  income and expense categories. `PUT /budgets/:month` replaces the whole month.
- **Actuals** per category, computed on read: normal transactions (entries with a `budget_month`) plus
  credit-card budget recognitions. Everything is converted to the display currency.
- **Credit-card settings** (`settings` in the response): how card purchases count in the budget.

## Credit-card settings

Two settings decide the month a card purchase counts in, and whether the whole purchase or each
installment counts:

| Setting | Values |
| --- | --- |
| `creditExpenseTiming` | `spend_month` (purchase month, or the statement closing month per installment), `payment_month` (month the bill is due), `month_after_payment` |
| `creditInstallmentBudgetMode` | `per_installment`, `full_amount` |

The **household default** lives on the household (`households.credit_expense_timing`,
`credit_installment_budget_mode`). A month can **override** either one (`budget_month_settings`, null =
follow the default); the month is the *purchase* month. `getMonthBudgetSettings` /
`resolveCreditBudgetSettings` in `budgets.settings.ts` are the only place that picks override vs default.

Purchases are **stamped** with the resolved settings when created (`budget_expense_timing`,
`budget_installment_mode`) and their `credit_card_budget_recognitions` are built from that stamp, by
`resolveBudgetMonth` in `credit-cards/credit-card-cycles.service.ts`. `PUT /budgets/:month/settings`
saves the override and calls `restampMonthPurchases`, which re-stamps every card purchase posted that
month and rebuilds its recognitions. Changing the household default only affects new purchases.

## Rules

- `budgets` extends `HouseholdScopedRepository`; so does `budget-month-settings.repository.ts`.
- Savings and investments are not budgeted yet. When they exist as categories, add their type to the
  response `categories` and to `BUDGET_SECTIONS` in the web app.
- Tests: `__tests__/budgets.http.test.ts`.

General module conventions: [../README.md](../README.md). Web UI: [apps/web/components/budgets/README.md](../../../../web/components/budgets/README.md).
