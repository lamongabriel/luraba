# Redesign progress

Everything for the redesign is merged into the single branch `redesign` (checked out in the main folder), so it can be tested in one place. Worker sessions build on their own worktree branches; the orchestrator session merges each finished branch into `redesign`, runs the checks and updates this file with every merge. If a session hits a usage limit, the next one picks up from the lists below.

Production (`main`, deployed) is at `3c28137`: notes/originalDescription, `/plan` page, combined base-currency totals, mobile list rows. Nothing on `redesign` is deployed yet.

## Done (merged into `redesign`)
- ReUI filters with a fixed required date filter; overlays are bottom drawers below 768px (`a1e54cf`, `bc7cc20`); the sidebar stays a slide-in on mobile (`8f7e922`, `b81b01d`); shared scrim token; `docs/nexus-audit.md`.
- `scripts/dev.sh` runner, Drizzle Studio and prod dump restore (`9cb8239`). Local `luraba_db` holds the production data; the old one is `luraba_db_pre_restore`.
- Transactions page redesign (`82ed038`, branch `claude/exciting-bun-163647`): date default covering the open card cycle, smaller KPIs restyled app-wide, layout, dark theme, mobile header. Not yet checked in the browser by me; the session did not open the final sidebar fix in a browser either.
- Credit cards page redesign (`cf4b06a`, branch `claude/friendly-wiles-647540`): card carousel, recent transactions, utilization, month picker; checked in dark only at desktop and 375px.
- Merge of all of the above into `redesign` (`4986b95`): typecheck, check and 216 web unit tests pass. Conflicts in `ui/sidebar.tsx`, `ui/sheet.tsx`, `ui/README.md` were resolved by keeping the version from the filters branch (both sessions made the same sidebar fix).

## In progress (worker sessions, not merged yet)
- Budgets, Goals and Bills pages (session budgets-goals-bills, running): split `/plan` back into separate Budgets and Goals pages, redesign Bills.

## Next
- Merge each finished branch into `redesign` (check conflicts around the shared KPI cards, navigation and filters), run typecheck, check, tests.
- Resume after the usage limit reset (about 04:40): check sessions, merge, update this file.
- Deploy `redesign` to production only after the owner has tested it.

## Notes
- If every API integration test fails with "missing required system payment methods", drop the throwaway `luraba_db_test` (0 connections) and rerun.
- 8 API integration tests (refunds, card feed, goals, splits) fail after UTC midnight; they also failed before the combined-totals merge. Not yet investigated.
