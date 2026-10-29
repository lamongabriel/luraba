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
- A contribution can be backed by a transaction (`transactionId`, unique, `ON DELETE SET NULL`).
  Linking supplies the amount (the whole transaction by default, or any part up to it) and the
  date from the transaction. It must be in the goal's currency; one transaction backs one
  contribution (409 otherwise). Loading and validating transactions goes through
  `transactions/transactions.linked.ts`.
- `savings` goals cannot have an expected return; switching a goal to savings clears it.
- Contribution endpoints return the whole goal detail so the client refreshes in one call.
- Goals send no notifications yet.

General module conventions: [../README.md](../README.md).
