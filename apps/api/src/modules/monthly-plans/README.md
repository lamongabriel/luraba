# monthly-plans

The month's plan against what happened: projected lines per **competency month**, and the report of projected
vs actual for each line. Replaces the planning spreadsheet.

## Shape

- `monthly_plan_lines` (household-scoped, `MonthlyPlansRepository extends HouseholdScopedRepository`): one row per
  month and line. `kind` is `salary`, `taxes`, `goal` (with `goal_id`) or `to_spend`; amounts are minor units of
  the row's currency. `PUT /monthly-plans` takes a month or a range (`from`, `to`, at most 60 months) plus the
  lines, **replaces** every line of those months and returns the report. Permissions: `goals.read` /
  `goals.update` (no separate permission).
- `GET /monthly-plans?from&to` is the report. Per month: `lines` (Salary, Taxes, one per goal, To spend),
  `investments` and `saved` totals (goal lines whose goal is an investment / savings goal), and
  `salaryReceivedOn`. Every line has `projected`, `actual` and `difference` (actual - projected).
- Amounts are in the plan currency; `fx` carries the rate from that currency to the household currency
  (and its date) for the UI/agent to show an approximate equivalent, or `null` when both are the same or no rate
  is available.

## Competency month

Plan, salary and taxes group by the month the money **belongs to**, not the posting date.

- A transaction's own `competency_month` wins.
- Otherwise, for **salary** income (category `Salary & Contracts`), a payment received on or after day 16
  (`SALARY_NEXT_MONTH_FROM_DAY`) belongs to the next month: received Oct 22 = November. Everything else uses the
  posted month.
- The categories are found by name (`MONTHLY_PLAN_SALARY_CATEGORY`, `MONTHLY_PLAN_TAXES_CATEGORY` in
  `@luraba/contracts/monthly-plans`; category names are unique per household). A household without them gets zero
  actuals for those lines.

## Actuals

| Line | Actual |
| --- | --- |
| Salary | income in `Salary & Contracts` with that competency month (and the dates received) |
| Taxes | expenses in `Business Taxes (DAS)` with that competency month |
| each goal | its contributions minus withdrawals dated in the month (moves ignored), in the goal's currency converted to the plan currency |
| To spend | the month's spending as the spending report counts it (expenses and card installments by posted date, net of refunds), **without** the taxes category, since taxes are their own line |

`To spend` projected is the stored `to_spend` line if there is one, otherwise
salary - taxes - all goal lines. Rows in another currency are converted with the FX service at their date.

## Seeding the owner's plan

Goals (monthly, Nov 2026 to Nov 2027): Investments Brazil (investment, 1,000), Investments USA (investment,
1,000), Honeymoon (savings, 1,000), Wedding Dinner (savings, 250), Furniture (savings, 250). Plan (USD):

| Months | Salary | Taxes | Goals | To spend |
| --- | --- | --- | --- | --- |
| 2026-10 | 5,500 | 250 | none | 5,250 |
| 2026-11 to 2027-01 | 5,500 | 350 | 3,500 | 1,650 |
| 2027-02 to 2027-11 | 5,500 | 500 | 3,500 | 1,500 |

Tests build exactly this (`__tests__/monthly-plan.http.test.ts`). In production, ask Claude over MCP: five
`create_goal` calls (`monthlyContribution`, `startMonth: "2026-11"`, `endMonth: "2027-11"`), then three
`set_monthly_plan` calls, one per row of the table (`lines` with `salary`, `taxes` and one `goal` line per goal).

Tests: `__tests__/monthly-plan.http.test.ts`; the goal funds are in `../goals/__tests__/goals-funds.http.test.ts`.

General module conventions: [../README.md](../README.md).
