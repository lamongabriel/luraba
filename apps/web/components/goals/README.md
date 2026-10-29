# components/goals

UI for the goals module (`/goals`, `/goals/[id]`).

| Component | Role |
| --- | --- |
| `goal-sheet.tsx` | Create/edit form (`FormSheet`). Money is typed in major units and converted with `majorToMinorUnits`; the expected return is typed as a percentage and sent as basis points. |
| `contribution-modal.tsx` | Add, withdraw or edit a manual contribution. |
| `link-transaction-modal.tsx` | Count an existing expense or transfer (all of it, or part) toward the goal. Only same-currency transactions are offered. |
| `goal-progress-chart.tsx` | Recharts line chart: saved so far (solid) and the monthly plan's projection (dashed), against the target line. |

Data comes from `services/goals.service.ts` → `queries/goals` → `mutations/goals`. Every mutation
invalidates `goalQueryKeys.all` because progress depends on all contributions. Labels, badge variants
and the basis-point helpers are in `lib/goals.ts`.

General web conventions: [../../README.md](../../README.md).
