# components/goals

UI for the goals module: the **Goals** page (`/goals`) and the goal detail page `/goals/[id]`.

```
header   Goals                                            [+ Create goal]   (mobile: round +, on the title's row)
total    Total saved  $14,800.00   (base currency; per-currency breakdown in the popover)
grid     [card] [card] [card]      3 columns desktop, 2 tablet, 1 mobile
card     (ring+glyph) Name                       [...]
                      by 31 Mar 2027
         $600 of $5,000                          12%
         ==-----|------   (bar with a tick where a steady pace would be)
         $4,400 to go                      Behind pace
```

No KPI tiles; the only summary is the "Total saved" line (combined with `useCombinedAmount`, canceled goals left out).

| File | Role |
| --- | --- |
| `app/(app)/goals/page.tsx` | The grid, the total, and every flow's state (drawer, create/edit sheet, add or withdraw money, link a transaction, delete confirmation). Active goals come first, then reached, then paused or canceled. |
| `goal-card.tsx` | One card. It opens the drawer; the menu has Add money, Withdraw, Link a transaction, Edit goal, Full details and Delete goal (by permission). The ring uses `ProgressRing` with the kind's glyph (`GOAL_KIND_ICON`; goals have no icon of their own). |
| `goal-detail-drawer.tsx` | The goal in a `SidePanel` (a bottom drawer on mobile): ring, saved, pace sentence, plan rows, the same action buttons, the progress chart and the latest contributions; the full list (edit or remove a contribution) stays on `/goals/[id]`. |
| `goal-layout.ts` | Grid, card and total sizes shared with `_loading.tsx`. |
| `goal-sheet.tsx` | Create/edit form (`FormSheet`). Money is typed in major units and converted with `majorToMinorUnits`; the expected return is typed as a percentage and sent as basis points. |
| `contribution-modal.tsx` | Add, withdraw or edit a manual contribution (`initialWithdrawal` opens on Withdraw). |
| `link-transaction-modal.tsx` | Count an existing expense or transfer (all of it, or part) toward the goal. Only same-currency transactions are offered. |
| `goal-progress-chart.tsx` | Recharts line chart: saved so far (solid) and the monthly plan's projection (dashed), against the target line. |
| `_empty.tsx`, `_error.tsx`, `_loading.tsx` (next to the page) | The three states; the skeleton is the total line plus six card skeletons. |

## Pace

`goalPace(goal, today)` in `lib/goal-pace.ts` (pure, tested in `lib/__tests__/goal-pace.test.ts`; `today` is passed in, in the user's time zone):

- **Target date**: a steady pace saves the target evenly from `startDate` to `targetDate`. `expectedSaved` is where that pace is today; `difference = saved - expectedSaved`. Past the date and not reached: behind.
- **Monthly plan, no date**: the pace is `monthlyContribution` per month since the start month (the start month counts).
- **Neither**, paused or canceled: no pace, nothing shown. At the target: "Goal reached".
- `on_pace` is within 2% of the target of the steady pace; beyond it, `ahead` or `behind`. `expectedPercent` positions the bar's tick. For a date goal, `projectedDate` is when the contribution rate so far (saved over days elapsed) reaches the target and `daysDifference` its distance to the target date (positive: early). Labels and colors: `GOAL_PACE_DISPLAY`.
- The API's `estimate.onTrack` (state `on_track` / `behind`) is separate and unchanged; the page shows the pace helper's answer.

Moving funds between accounts (`POST /goals/:id/move`, `/contribute`, `/withdraw` with accounts) has no web form yet; the page offers the manual contribution, withdrawal and transaction-link flows. Add a "Move funds" action to the card menu and drawer when it is built.

Data comes from `services/goals.service.ts` → `queries/goals` → `mutations/goals`. Every mutation
invalidates `goalQueryKeys.all` because progress depends on all contributions. Labels, badge variants
and the basis-point helpers are in `lib/goals.ts`.

General web conventions: [../../README.md](../../README.md).
