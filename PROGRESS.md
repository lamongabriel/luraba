# Redesign progress

Everything for the redesign is merged into the single branch `redesign` (checked out in the main folder), so it can be tested in one place. Worker sessions build on their own worktree branches; the orchestrator session merges each finished branch into `redesign`, runs the checks and updates this file with every merge. If a session hits a usage limit, the next one picks up from the lists below.

Production (`main`, deployed) is at `3c28137`: notes/originalDescription, `/plan` page, combined base-currency totals, mobile list rows. Nothing on `redesign` is deployed yet.

## Done (merged into `redesign`)
- ReUI filters with a fixed required date filter; overlays are bottom drawers below 768px (`a1e54cf`, `bc7cc20`); the sidebar stays a slide-in on mobile (`8f7e922`, `b81b01d`); shared scrim token; `docs/nexus-audit.md`.
- `scripts/dev.sh` runner, Drizzle Studio and prod dump restore (`9cb8239`). Local `luraba_db` holds the production data; the old one is `luraba_db_pre_restore`.
- Transactions page redesign (`82ed038`, branch `claude/exciting-bun-163647`): date default covering the open card cycle, smaller KPIs restyled app-wide, layout, dark theme, mobile header. Not yet checked in the browser by me; the session did not open the final sidebar fix in a browser either.
- Credit cards page redesign (`cf4b06a`, branch `claude/friendly-wiles-647540`): card carousel, recent transactions, utilization, month picker; checked in dark only at desktop and 375px.
- Merge of all of the above into `redesign` (`4986b95`): typecheck, check and 216 web unit tests pass. Conflicts in `ui/sidebar.tsx`, `ui/sheet.tsx`, `ui/README.md` were resolved by keeping the version from the filters branch (both sessions made the same sidebar fix).

## Done, continued
- Budgets, Goals and Bills redesigned as separate pages, `/plan` removed (branch `claude/zealous-swirles-5c8a10`, merged as `593390c`). Checked by the session in dark mode only. Conflict in `finance/page-header.tsx` resolved by keeping both `mobileActions` (transactions) and `inlineActions` (budgets/bills).

## In progress (worker sessions, not merged yet)
- Fix round 1 (owner tested `redesign` and rejected the look; earlier sessions did not port Nexus):
  - Session tx-filters-fix: Transactions page, ReUI filters (icons, operators, Filter button separate from Actions), short date chip, breakpoints, mobile filter/date drawers with fixed footer, create-transaction drawer (fixed header/footer, no horizontal scroll), shared drawer wrapper.
  - Session shared-ui-cards-pages: one shared PageHeader with right-aligned action standard and inline KPI slot, one shared month select, credit cards using the real card faces with working snap carousel, budgets (new allocation visual, copy-last-month inside Add budget), goals (inline KPIs), bills consistency.
- Budgets, Goals and Bills pages (session budgets-goals-bills, running): split `/plan` back into separate Budgets and Goals pages, redesign Bills.

## Fix round 1 status
- Both fix sessions hit a usage limit and were partly done; their commits are merged into `redesign` (`d365906`). On that state `pnpm typecheck` fails in apps/api (`accounts.service.ts:319`, new `exclude*` fields in transactions list requests) and one web conventions test (no tables on mobile) fails. Both sessions were told to merge `redesign`, fix these and finish their lists. Re-merge their branches (`claude/jolly-chandrasekhar-361bfc`, `claude/inspiring-hermann-992151`) when they report.

## Status at 04:50 (after limit reset)
- Merged `claude/inspiring-hermann-992151` (shared-ui-cards-pages, commits `1b8c557`, `78ee099`: header actions migrated, conventions test, finance README) into `redesign`. Web unit tests: 223 pass; biome warnings rose to 12 (was 4-5), not yet looked at.
- Session tx-filters-fix (`claude/jolly-chandrasekhar-361bfc`) is still running; its API typecheck error (`accounts.service.ts:319`) remains until it finishes. Re-merge when it reports.
- Not yet verified by a human: every page in the browser (light and dark, 375px to 1440px).

## Status at 05:00
- Merged `claude/jolly-chandrasekhar-361bfc` (tx-filters-fix) into `redesign` (`c0e2b1e`); conflict in `filters/README.md` resolved. `claude/inspiring-hermann-992151` (shared-ui-cards-pages) was already in.
- On `redesign`: typecheck clean, biome 0 errors (12 warnings), 224 web unit tests and 470 API integration tests pass. The 8 date-dependent API tests that failed after UTC midnight pass now (it is past 03:00 UTC again), which supports the clock theory: they fail between 21:00 and 24:00 Brazil time. A real bug for late-evening use is still possible and uninvestigated.
- Reported as not done: tx-filters-fix says one uploads integration test failed in its own run (passed here); shared-ui-cards-pages did not check 768px or light mode and only checked the Add budget copy option and Goals header KPIs in code.
- Still to do by a human: browser review of every redesigned page (light and dark, 375px to 1440px).

## Next
- Unify the two month pickers: `filters/month-preset-button.tsx` (Budgets, Bills) and `finance/month-picker.tsx` (Credit cards) should be one shared component.
- Browser check of every redesigned page in light mode, and the user menu bottom drawer on mobile.
- Merge each finished branch into `redesign` (check conflicts around the shared KPI cards, navigation and filters), run typecheck, check, tests.
- Resume after the usage limit reset (about 04:40): check sessions, merge, update this file.
- Deploy `redesign` to production only after the owner has tested it.

## Notes
- If every API integration test fails with "missing required system payment methods", drop the throwaway `luraba_db_test` (0 connections) and rerun.
- 8 API integration tests (refunds, card feed, goals, splits) fail after UTC midnight; they also failed before the combined-totals merge. Not yet investigated.

## Check at 2026-11-13 (second orchestration check)
- No session is running and every worker branch is already merged into `redesign` (`git branch --no-merged redesign` is empty), so there was nothing to nudge or merge. `redesign` stays at the 05:00 state; checks were green then and no code changed since.
- Still waiting on the owner: test `redesign` and send feedback. Optional next step: a browser-verification session (375/768/1100/1440px, light and dark).

## Custom and editable card installment amounts (91417f3, a9add06, 12f7cbe)
- Shipped: exact `installmentAmounts` / `installmentAmount` / `roundingMode` on card purchase create and update (installments are the source of truth; a disagreeing `amount` is rejected), `PATCH /credit-cards/:id/purchases/:purchaseId/installments/:installmentId`, closed-invoice installments kept on count/total changes, custom amounts kept through cycle rebuilds, MCP `create_transaction` fields plus `update_card_purchase` and `update_installment` (both with `dryRun`), "Set each installment" switch and rows in the transaction form, docs. Limit is 60.
- Verified: typecheck, biome (0 errors), web 227, MCP 44, domain 106, contracts 22; API integration 473 of 479 on the full run, and the 6 that failed (bills, one households test) pass when rerun alone (39 of 39), so likely interference from other work running at the same time. In the browser (desktop and 375px): create flow with 5 rows and the derived total saved 3405 x4 + 3406 through the real API (test purchase deleted again); edit mode opens. Fixed a crash found there (`useFormContext` without a provider).
- Not verified: saving an edit of an existing purchase through the form in the browser; editing one installment from the UI (no UI for it yet, only API/MCP); production data.
- Also fixed a stale MCP test fixture (`limitUsed` missing in the overview mock).

## Fix: report_budget rolls up subcategories (2026-11-13)
- Root cause: the budgets API returns flat per-category rows; only the web page added subcategory spending to the parent. `report_budget` used the raw rows.
- Moved the rollup (`buildBudgetItems`) into `@luraba/domain`; web re-exports it, MCP uses it. `report_budget` now returns parent `actual`/`remaining`/`overBudget` rolled up, plus `ownActual`, `allocated`, `unallocated`, nested `subcategories` each with `parent`. Totals unchanged (already no double count). Unit test in `apps/mcp/src/__tests__/report-budget.unit.test.ts`.

## Archive for accounts and credit cards (branch claude/nice-liskov-b11c35)
- Migration `0057_account_archive` adds nullable `archived_at` to `accounts` and `credit_cards`. `archivedAt` is on the account and card wire shapes.
- API: `POST /accounts/:id/archive|unarchive` and `POST /credit-cards/:id/archive|unarchive` (reuse `accounts.update` / `credit_cards.update`). Decision: archiving needs a zero balance (409 with a clear message, no force flag); an account that owns active cards cannot be archived. Lists and the card overview hide archived rows unless `includeArchived=true`; exports include them.
- New activity on an archived account or card (expense, income, transfer, adjustment, refund, card purchase or payment, moving a transaction onto it) is rejected with 409 via `assertNotArchived`. History, other balances and reports are untouched.
- MCP: `archive_account`, `unarchive_account`, `archive_credit_card`, `unarchive_credit_card`, `includeArchived` on `list_accounts` and `list_credit_cards`; name resolution skips archived ones.
- Web: Archive/Unarchive row in the account and card edit sheets, "Show archived" header button on /accounts and /credit-cards, dimmed archived rows and tiles; pickers never offer archived accounts.
- Note: parallel sessions share the `luraba_db_test` database and wipe it mid-run; this work used `DB_NAME=luraba_db_test_archive`.
- Known gap: editing an existing transaction that sits on an archived account shows an empty account picker (the picker omits archived accounts).
