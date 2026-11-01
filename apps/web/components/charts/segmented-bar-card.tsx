"use client";

import { cn } from "@/lib/utils";
import { ChartCard, type ChartCardProps } from "./chart-card";
import { formatChartMoney } from "./chart-format";
import { paletteColor } from "./chart-theme";
import type { DonutSlice } from "./types";

export interface SegmentedBarCardProps extends Omit<ChartCardProps, "children" | "isEmpty"> {
  /** Slices in minor units. Beyond `maxSlices` the smallest are folded into "Other". */
  data: DonutSlice[];
  currencyCode: string;
  precision?: number;
  language?: string;
  maxSlices?: number;
  /** Grid classes of the legend (`sm:grid-cols-3` wide, `grid-cols-1` in a narrow column). */
  legendClassName?: string;
}

/**
 * A breakdown as one slim segmented bar with a legend of name, amount and share: the compact
 * alternative to a donut when the breakdown is supporting detail, not the page's subject.
 */
export function SegmentedBarCard({
  data,
  currencyCode,
  precision = 2,
  language = "en",
  maxSlices = 6,
  legendClassName = "grid-cols-2 sm:grid-cols-3",
  flat = true,
  heightClassName = "h-24",
  ...card
}: SegmentedBarCardProps) {
  const format = { currencyCode, precision, language };
  const sorted = data.filter((slice) => slice.value > 0).sort((a, b) => b.value - a.value);
  const shown = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices).reduce((sum, slice) => sum + slice.value, 0);
  const slices = [
    ...shown.map((slice, index) => ({ ...slice, fill: slice.color ?? paletteColor(index) })),
    ...(rest > 0
      ? [{ id: "other", name: "Other", value: rest, fill: "var(--color-muted-foreground)" }]
      : []),
  ];
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <ChartCard
      {...card}
      flat={flat}
      heightClassName={heightClassName}
      isEmpty={slices.length === 0}
    >
      <div className="space-y-3">
        <div
          role="img"
          aria-label={`${card.title}: ${slices.map((slice) => slice.name).join(", ")}`}
          className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted"
        >
          {slices.map((slice) => (
            <div
              key={slice.id ?? slice.name}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(slice.value / total) * 100}%`, backgroundColor: slice.fill }}
            />
          ))}
        </div>
        <ul
          className={cn("grid gap-x-6 gap-y-1.5", legendClassName)}
          aria-label={`${card.title} legend`}
        >
          {slices.map((slice) => (
            <li key={slice.id ?? slice.name} className="flex min-w-0 items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: slice.fill }}
              />
              <span className="min-w-0 flex-1 truncate">{slice.name}</span>
              <span className="font-mono tabular-nums text-muted-foreground">
                {formatChartMoney(slice.value, format)}
              </span>
              <span className="w-9 text-right font-mono tabular-nums text-muted-foreground">
                {Math.round((slice.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
