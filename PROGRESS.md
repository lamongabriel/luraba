# Redesign progress

Everything for the redesign is merged into the single branch `redesign` (checked out in the main folder), so it can be tested in one place. Worker sessions build on their own worktree branches; the orchestrator session merges each finished branch into `redesign`, runs the checks and updates this file with every merge. If a session hits a usage limit, the next one picks up from the lists below.

Production (`main`, deployed) is at `3c28137`: notes/originalDescription, `/plan` page, combined base-currency totals, mobile list rows. Nothing on `redesign` is deployed yet.

## Done (merged into `redesign`)
- ReUI filters with a fixed required date filter; overlays are bottom drawers below 768px (`a1e54cf`, `bc7cc20`).
- `scripts/dev.sh` runner, Drizzle Studio and prod dump restore (`9cb8239`). Local `luraba_db` holds the production data; the old one is `luraba_db_pre_restore`.

## In progress (worker sessions, not merged yet)
- Transactions page redesign (session transactions-redesign, branch `claude/exciting-bun-163647`): KPI restyle, layout, dark theme, mobile header.
- Credit cards page redesign (session cards-page-redesign, branch `claude/friendly-wiles-647540`): card carousel, recent transactions, utilization.
- Budgets, Goals and Bills pages (session budgets-goals-bills-redesign, branch `claude/zealous-swirles-5c8a10`): done, waiting to be merged. `/plan` removed, Budgets (allocation donut + budget cards), Goals (cards, pace, drawer) and Bills (summary bar + grouped rows) rebuilt, shared `MonthPresetButton`/`useMonthFilter`, `PageAddButton`, `BillStateDisplay`. The app only has a dark theme on this branch, so verification was dark at 375px and desktop. Skipped: a web form for moving goal funds between accounts (API only).

## Next
- Merge each finished branch into `redesign` (check conflicts around the shared KPI cards, navigation and filters), run typecheck, check, tests.
- Resume after the usage limit reset (about 04:40): check sessions, merge, update this file.
- Deploy `redesign` to production only after the owner has tested it.

## Notes
- If every API integration test fails with "missing required system payment methods", drop the throwaway `luraba_db_test` (0 connections) and rerun.
- 8 API integration tests (refunds, card feed, goals, splits) fail after UTC midnight; they also failed before the combined-totals merge. Not yet investigated.
