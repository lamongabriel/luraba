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

- `KpiCard`: `title`, `value` (or children for values built from several parts), `description`,
  `icon`, `comparison`, `trend` (sparkline). Need something it lacks (a tone, a link)? Add it here.
- `KpiGrid`: `columns` 2, 3 or 4; the responsive classes live in `kpi-grid.tsx`.
- `KpiCardSkeleton` / `KpiGridSkeleton`: the loading twins. They share `KPI_CARD_MIN_HEIGHT` with the
  card, so loading never shifts the page. Use them in the page's `_loading.tsx`.
