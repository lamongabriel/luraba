# Charts

The one way to draw a chart in the web app. Every chart is a **card** (shared card header, title,
optional icon, description and actions) with built-in **loading**, **error** (shared `ErrorState`
with a retry) and **empty** (shared `EmptyState`) bodies, consistent tooltips and axis labels, and
colors from the theme. Pages pass data and props; they never touch Recharts.

```tsx
import { AreaChartCard, BarChartCard, CHART_SEMANTIC, DonutChartCard } from "@/components/charts";

<AreaChartCard
  title="Balance history"
  status={query.isError ? "error" : query.data ? "ready" : "loading"}
  onRetry={() => void query.refetch()}
  data={points}                          // [{ date: "2026-03-05", balance: 12345 }], minor units
  series={[{ key: "balance", label: "Balance" }]}
  currencyCode="USD"
  precision={2}
  bucket="day"                           // "day" | "week" | "month": axis and tooltip labels
/>
```

| Component | For | Data |
| --- | --- | --- |
| `AreaChartCard` | A time series (balance, net worth). `stacked` stacks several series | rows with a `YYYY-MM-DD` `xKey` (default `date`) and one number per `series` key |
| `SegmentedBarCard` | A breakdown as one slim segmented bar with a legend (name, amount, share); flat by default. The compact alternative to a donut for supporting detail; `legendClassName` sets the legend columns | `data: DonutSlice[]`, `currencyCode`, `maxSlices` |
| `BarChartCard` | Cash flow, spending per period. Grouped by default, `stacked` for one bar. Optional `getBarColor`, `onBarClick` and `isRowActive` make bars colored per row, clickable and dimmed when not selected (credit card invoices). `lineSeries` draws series as a dashed line over the bars (budget vs spent) | same as above |
| `DonutChartCard` | A breakdown with a total in the middle and a legend (amount and share). `legend="hover"` drops the permanent legend: only the ring shows, and name, amount and share appear in the tooltip on hover/focus (narrow rails, the Nubank way); `flat` cards use the page background for slice gaps | `data: { id?, name, value, color? }[]` |
| `GaugeChartCard` | One number against a limit as a semicircle (budget used, quota). `percent`, `tone` (`positive` / `warning` / `negative` / `neutral`), `centerValue`, `centerLabel`; `children` render under the arc inside the same fixed height (a row of stats) | `percent` 0-100 |
| `ProgressRing` | A small circular progress indicator (not a card) for list items: one per category budget, goal or invoice. Pure SVG, cheap to repeat | `percent`, `tone` or `color`, `size`, `label`, center `children` |
| `ChartCard` | The shell. Use it directly only for a chart the three above cannot draw (then add that chart here) | children |

Shared props (`ChartCardProps`): `title`, `description`, `icon`, `actions` (header, hidden while
loading), `status` (`ready` | `loading` | `error`), `errorMessage`, `onRetry`, `emptyTitle`,
`emptyDescription`, `heightClassName` (default `h-64`), `className`. Money charts also take
`currencyCode`, `precision` and `language`. **Money is always minor units**; formatting goes through
`formatCurrency` / `formatMoney` and dates through the `@luraba/domain` display helpers (UTC, see
[docs/formatting.md](../../../../docs/formatting.md)). Never pass pre-formatted numbers.

## Rules

- **No `recharts` import outside this folder** (and `ui/chart.tsx`). `test/conventions.test.ts` fails
  on a new one. Need something the library lacks? Add it here: a new `XChartCard` built on `ChartCard`
  and `ChartTooltipBody`, exported from `index.ts`, with a row in the table above.
- **Loading is the same size as the chart.** `ChartCard` renders the real header and a skeleton of
  `heightClassName`, so switching state never moves the page. Pages use `status="loading"` for chart
  sections instead of `Skeleton`.
- **Colors come from `chart-theme.ts`**: `CHART_PALETTE` (the theme's `--chart-*` tokens, cycled)
  for categories; `CHART_SEMANTIC.positive|negative` for money in / money out. Never hard-code a hex
  in a page. The legend and tooltip always carry the series name, so color is never the only cue.
- Series `key`s are plain identifiers (`balance`, `moneyIn`): they become CSS variables
  (`--color-<key>`) for Recharts.
- Animations are off on purpose (stable screenshots and tests, no layout jank when the period changes).

## Legacy charts (not migrated)

`gradient-area-chart`, `dotted-bar-chart`, `vertical-bar-chart`, `step-area-chart`,
`priority-donut-chart` and `chart-state` are the first, per-feature charts used by the investments
pages. Charts also drawn straight with Recharts: the transactions expense breakdown, credit card
invoice history, goal progress, investment price and performance charts (the allow-list in
`test/conventions.test.ts`). Migrate them to the cards above when you touch them, then remove them
from the allow-list; do not copy them.

Tests: `__tests__/charts.test.tsx`.

## Flat charts

`ChartCard` (and so every `*ChartCard`) takes `flat`: no card, no header, only the plot with the same
loading, error and empty bodies. Use it for a hero chart that sits on the page under a headline number.

## Palette and dark theme

The app is dark only. The categorical ramp (`--chart-1..5`, the lightest green first, borrowed from the Nexus dark theme)
and the semantic money colors (`--chart-positive`, `--chart-negative`) are defined once in `app/globals.css`;
`chart-theme.ts` only references them. Change the palette there and every chart, gauge and KPI sparkline follows. Keep each
value at 3:1 or better against `--card`.
