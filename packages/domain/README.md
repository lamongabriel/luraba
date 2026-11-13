# @luraba/domain

Framework-free finance, date and recurrence primitives shared by the API, worker and web app.
No I/O, no framework imports.

- `date.ts` parsing, formatting, timezone ranges and calendar helpers (`formatISODate`,
  `getTodayInTimezone`, `parseISODate`...). Do not reimplement date logic elsewhere. Month helpers are UTC (`startOfMonth`, `addMonths` force day 1; `formatMonthKey`, `parseMonthKey`, `shiftMonthKey` use `YYYY-MM` keys).
- `money.ts` minor-unit math and formatting.
- `recurrency.ts` generic schedules (monthly/weekly/...), bounded by occurrences, end date or a
  requested range, mapped into a module-specific result. Bills use it.
- `bills.ts`, `classification.ts`, `periods.ts` domain rules built on the above.
- `credit-cards.ts` credit limit breakdown (closed / open / future invoices, available) from billing cycles; dates are ISO strings.
- `installments.ts` card installment splitting: `splitInstallmentAmounts` (modes `remainder_last`, `remainder_first`, `round_up_all`) and `resolveInstallmentPlan`, which turns `amount` / `installmentAmounts` / `installmentAmount` / `roundingMode` into the final list and total (the list wins; a disagreeing `amount` is an error). The API and the web form share it.
- `loans.ts` loan maths: scheduled installment, due dates (month ends clamp), payment-by-payment schedule and the outlook for a day (next payment, interest paid, payoff date). The account detail page uses it.
- `budget-items.ts` budget rollup (`buildBudgetItems`): a parent's actual = own + subcategories, plus `directAmount` and `allocated`. Web Budgets page and MCP `report_budget` share it.
- `goals.ts` savings/investment goal maths: required monthly amount, completion projection with optional compounding, on-track pace, and the progress timeline.

Add tests in `src/__tests__` for anything with edge cases (month ends, DST, rounding).
