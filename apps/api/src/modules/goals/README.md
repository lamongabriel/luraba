# goals

Things to save or invest toward: an amount, optionally a date and a monthly plan, with an estimate
of when it will be reached.

## Shape

- `GoalsRepository extends HouseholdScopedRepository` (scoped get/create/update/delete,
  `listPage`). Contributions (`goal_contributions`) have no household column: load the goal with
  `get(id, context)` first (the service's `requireGoal`), then reach them by id with the goal id in
  the query.
- Progress is the **sum of contributions** (signed: a negative amount is a withdrawal). Nothing
  about progress is stored. `saved`, `state`, `achievedOn` and the whole `estimate` are computed on
  read, which is why lists load the contributions of the page's goals.
- `state` is derived: the goal's `status` (paused/canceled) wins, then achieved (saved reached the
  target), on_track/behind (from the estimate) or open (no target date and no monthly plan).
- The maths lives in `@luraba/domain` (`goals.ts`: `estimateGoal`, `projectBalances`,
  `buildGoalTimeline`) so it is unit tested without a database and reusable by the web.
  - `requiredMonthly`: what must go in each month to reach the target by the target date.
  - `projectedCompletionDate`: when the monthly plan reaches the target. Investment goals compound
    at `expectedReturnBps` (basis points, 700 = 7% a year); the return only affects the estimate,
    `saved` is always the money put in.
  - On track with a monthly plan means the projection finishes by the target date; with a date and
    no plan it means `saved` is at least a steady pace from `startDate`.
- A goal is planned **one way**: a target date (the estimate gives the monthly amount needed) or a monthly amount (the estimate gives the finish date), never both; the contract and `updateGoal` reject both. With neither it is open-ended.
- A contribution can be backed by a transaction (`transactionId`, unique, `ON DELETE SET NULL`).
  Linking supplies the amount (the whole transaction by default, or any part up to it) and the
  date from the transaction. It must be in the goal's currency; one transaction backs one
  contribution (409 otherwise). Loading and validating transactions goes through
  `transactions/transactions.linked.ts`.
- `savings` goals cannot have an expected return; switching a goal to savings clears it.
- **Goals are not tied to an account.** Money moves between savings pots and brokerages, and several goals can
  share one account, so progress is tracked per goal. `goal_contributions` rows carry a `kind`:
  `contribution` (amount > 0), `withdrawal` (amount < 0) or `move` (amount > 0, never progress). `saved` and the
  estimate ignore `move` rows (`countsAsProgress`).
- **Where the money sits** (`locations` on every goal, computed on read, sums to `saved`): a contribution adds to
  its `toAccountId`, a withdrawal takes from its `fromAccountId`, a move takes from `fromAccountId` and adds to
  `toAccountId`. Rows without an account (older or hand-entered) sit under `accountId: null`.
  `goals.accountId` stays informational.
- **Funds endpoints** (`goals.service.ts`, permission `goals.update`; each returns the goal detail):
  - `POST /goals/:id/contribute`: creates a transfer `fromAccountId` -> `toAccountId` (neutral in spending and
    income) and a `contribution` row linked to it, or links `transactionId` instead of creating one. The amount is
    in `currencyCode` (default the goal's); in another currency `fxRate` (goal units per 1 of that currency) is
    required, the converted amount is the progress, and `originalAmount`/`originalCurrency`/`fxRate` are stored.
    The account in the goal's currency gets exactly the converted amount, so the stored rate matches the books.
  - `POST /goals/:id/move`: a transfer plus a `move` row; fails (422) when `fromAccountId` holds less of this
    goal than the amount.
  - `POST /goals/:id/withdraw`: a `withdrawal` row. Link the expense it paid for (`expenseId`, amount defaults to
    the expense's when it is in the goal's currency; one expense backs one row, 409 otherwise) or give
    `toAccountId` to return the money, which creates a transfer.
  - `GET /goals/report?month=YYYY-MM`: per goal, `planned` (the monthly contribution inside the plan's months),
    `contributed` (contributions minus withdrawals dated in the month), `saved`, percent, on track and
    `locations`. Canceled goals are left out.
- `endMonth` (`end_month`, first of the month, exposed as `YYYY-MM`) is the last month of the monthly plan;
  the start month is the start date's. It is separate from `targetDate`. `targetAmount` stays required: the MCP
  `create_goal` fills it with monthly x months when only an end month is given.
- Contribution endpoints return the whole goal detail so the client refreshes in one call.
- Goals send no notifications yet.

General module conventions: [../README.md](../README.md).
