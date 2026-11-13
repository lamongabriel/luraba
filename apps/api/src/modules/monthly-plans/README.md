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

## Left to spend (`GET /monthly-plans/safe-to-spend?month=YYYY-MM`)

`safe-to-spend.service.ts` answers "how much can I still spend?" for the MCP tool
`report_safe_to_spend`. It reuses the other modules' services (`getGoalsReport`, `getMonthlyPlanReport`,
`listCyclesThroughMonth`, `billsRepository.listUpcomingOccurrences`, `listAccounts`, `getMonthlyBudget`); it has no
SQL and no parallel maths. Permission `goals.read`. `currencies[]` is one block per **currency**, each in its own
currency and never mixed: a currency exists when an account, bill, goal or invoice is in it. `combined` adds the two
headline figures (`leftToSpend`, and `leftForCard` for the currencies that have a plan, `null` when none does) converted
into the household base currency by the [fx module](../fx/README.md), with the rates used and the per-currency amounts.

**This month, in cash** (`thisMonth`):

```
leftToSpend = spendableBalance - billsRemaining - goalsOwed - invoicesDue
spendableBalance = sum(spendable account balances) - goal money held in them
```

**Next month, on the card** (`nextMonth`): card spending is billed next month, so it is checked against next month.

```
leftForCard = projectedIncome - (bills + goals + cardCharged)
```

Assumptions (also documented here so nobody re-derives them):

- **Spendable accounts**: `cash` accounts with subtype `checking`, `cash`, `prepaid` or `other`, in their own currency.
  Savings (piggy banks, "caixinhas"), money market and CDs are where money is set aside, so they are excluded;
  investment, crypto and other asset types never count. Goal money located in a spendable account
  (`goals[].locations`, same currency, capped at that account's balance) is subtracted, because it is not free to spend.
- **Balance, not "carried + income"**: the balance already contains the income received and the cash spent so far, so
  it is used as is. Adding "income received" on top would count it twice. `incomeReceived` / `incomeProjected` (salary
  minus taxes, **plan currency only**, competency month) are returned as memo figures for the UI.
- **Competency month**: income comes from the monthly plan report, so a salary received on or after day 16
  (`SALARY_NEXT_MONTH_FROM_DAY`) belongs to the next month; a transaction's own `competency_month` wins. A salary
  already received for next month is in the balance and is not added again to `leftToSpend`.
- **Bills**: unpaid, unskipped occurrences of active bills. Everything due up to the end of the month, **including
  overdue ones**, is owed this month; occurrences due next month go to `nextMonth.bills`.
- **Goals**: per goal, `owed = max(0, planned - contributed)` for the month (`getGoalsReport`: the monthly plan inside the
  goal's months, contributions minus withdrawals dated in the month, moves ignored), in the goal's currency. Next
  month adds the goals' planned amount for the next month. Paused or canceled goals plan 0.
- **Card invoices**: per card (in the card's currency), every cycle with `remainingAmount > 0` due up to the end of the
  month is cash owed (`invoicesDue`, overdue included); cycles due next month are `cardCharged` (what is already
  billed next month: the open invoice plus installments landing there). Invoices due later are ignored. A card
  purchase made now lands on whichever invoice is open; the what-if assumes the invoice due next month.
- **Income plan**: the monthly plan has **one currency**. `projectedIncome` is `salary - taxes` of next month's plan in
  that currency; other currencies get `projectedIncome: null` and `leftForCard: null` ("No plan") instead of a made-up
  number. Taxes and `to_spend` lines are not otherwise subtracted from this month's cash.
- **Budgets do not enter the maths.** `budgets.overspent` lists expense categories whose actual is above their
  budget (in the budget currency) as guidance only.
- The `month` parameter moves the whole calculation (past months use the balance as of now: it is a "today" tool).

Tests: `__tests__/safe-to-spend.http.test.ts` (bills and goals owed, goals all met, unpaid invoice due this month and
next month's card charges, plan income net of taxes, goal money and savings accounts excluded plus an overspent
budget, mixed currencies, household isolation).

Tests: `__tests__/monthly-plan.http.test.ts`; the goal funds are in `../goals/__tests__/goals-funds.http.test.ts`.

General module conventions: [../README.md](../README.md).
