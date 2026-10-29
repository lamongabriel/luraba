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
- `goals.ts` savings/investment goal maths: required monthly amount, completion projection with optional compounding, on-track pace, and the progress timeline.

Add tests in `src/__tests__` for anything with edge cases (month ends, DST, rounding).
