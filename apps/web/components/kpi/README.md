# KPI cards

The one way to show a headline number (a total, a count, a status fact) on any page. Do not build a
page-local `Stat`, `SummaryTile` or `MetricCard`; the convention test fails on them.

```tsx
import { KpiCard, KpiGrid, KpiGridSkeleton } from "@/components/kpi";

<KpiGrid columns={3}>
  <KpiCard title="Money in" value={<AmountDisplay ... />} comparison={{ value: 12, state: "positive" }} trend={points} />
  <KpiCard title="Payments made" description="of 24">{paid}</KpiCard>
</KpiGrid>
```

- `KpiCard`: `title`, `value` (or children for values built from several parts: they stack with a gap, never glue together), `secondary` (a smaller muted line under the value, e.g. "of $500"; never put a second amount next to the headline), `description`,
  `icon`, `comparison`, `trend` (sparkline), `className` (a status border or tint). Need something it lacks (a tone, a link)? Add it here.
- `KpiGrid`: `columns` 2, 3 or 4; the responsive classes live in `kpi-grid.tsx`.
- `KpiCardSkeleton` / `KpiGridSkeleton`: the loading twins. They share `KPI_CARD_MIN_HEIGHT` with the
  card, so loading never shifts the page. Use them in the page's `_loading.tsx`.
- `KpiStat`: a compact label-over-value cell for a row of small facts *inside* another card (the gauge's days left, daily allowance, projection). A headline number of its own is a `KpiCard`.

## KpiStrip

`KpiStrip` (+ `KpiStripSkeleton`) is a slim row of 3 to 5 figures on hairlines, directly on the page, for
numbers that support a hero value (account detail). Use `KpiGrid` when each number needs its own card.

`KpiStrip` also takes a `lead` cell (3 or 4 items): a wider first cell for the headline figure with a small ring
(the Budgets page's "Remaining of the limit"); `KpiStripSkeleton` takes the same prop for its loading twin.

## Card style (every page)

`KpiCard` is deliberately small: a muted title and an optional icon tile on one row, a bold tabular value, then one
muted line (comparison, `secondary` or `description`). Pass `icon` and `tone` (`positive` green, `negative` red,
`primary`, default `neutral`) when the figure has a meaning: money in is green, money out is red. The tone colors the
tile and the sparkline; dark mode values live in `KPI_TONE_CLASSES`. The card and its skeleton share
`KPI_CARD_MIN_HEIGHT` and the same header row, so changing one means changing both.

## KpiMobileSummary

Below `md` a row of cards is too big for three numbers. `KpiMobileSummary` (+ `KpiMobileSummarySkeleton`) is the phone
version: a title row (with an `action` such as the date filter), a hairline, then one short text row per figure. It
renders only below `md`; wrap the `KpiGrid` of the same page in `max-md:hidden`. The transactions page is the example.
