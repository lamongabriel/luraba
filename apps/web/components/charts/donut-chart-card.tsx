"use client";

import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

import { ChartCard, type ChartCardProps } from "./chart-card";
import { formatChartMoney } from "./chart-format";
import { paletteColor } from "./chart-theme";
import { ChartTooltipBody } from "./chart-tooltip";
import type { DonutSlice } from "./types";

export interface DonutChartCardProps extends Omit<ChartCardProps, "children" | "isEmpty"> {
  /** Slices in minor units, largest first. Slices without a `color` take the palette in order. */
  data: DonutSlice[];
  currencyCode: string;
  precision?: number;
  language?: string;
  /** Text under the total in the middle of the ring. */
  centerLabel?: string;
  /**
   * `list` (default) shows a legend beside the ring. `hover` shows only the ring: name, amount and
   * share appear in the tooltip on hover or focus, for narrow rails.
   */
  legend?: "list" | "hover";
}

/** A breakdown as a ring with the total in the middle and a legend with amounts and shares. */
export function DonutChartCard({
  data,
  currencyCode,
  precision = 2,
  language = "en",
  centerLabel = "Total",
  legend = "list",
  ...card
}: DonutChartCardProps) {
  const format = { currencyCode, precision, language };
  const slices = data
    .filter((slice) => slice.value > 0)
    .map((slice, index) => ({ ...slice, fill: slice.color ?? paletteColor(index) }));
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  const hoverLegend = legend === "hover";
  const formatSlice = (value: number) =>
    hoverLegend && total > 0
      ? `${formatChartMoney(value, format)} · ${Math.round((value / total) * 100)}%`
      : formatChartMoney(value, format);

  return (
    <ChartCard {...card} isEmpty={slices.length === 0}>
      <div
        className={
          hoverLegend
            ? "grid h-full min-h-0 place-items-center"
            : "grid h-full min-h-0 items-center gap-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]"
        }
      >
        <div
          className={`relative mx-auto aspect-square w-full ${hoverLegend ? "max-h-full max-w-44" : "max-w-48"}`}
        >
          <ChartContainer config={{ value: { label: centerLabel } }} className="size-full">
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipBody formatValue={formatSlice} />} />
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={2}
                stroke={card.flat ? "var(--color-background)" : "var(--color-card)"}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((slice) => (
                  <Cell key={slice.id ?? slice.name} fill={slice.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[0.7rem] text-muted-foreground">{centerLabel}</span>
            <span className="max-w-[60%] truncate text-sm font-semibold tabular-nums">
              {formatChartMoney(total, format)}
            </span>
          </div>
        </div>
        {hoverLegend ? null : (
          <ul className="grid max-h-full gap-2 overflow-y-auto" aria-label={`${card.title} legend`}>
            {slices.map((slice) => (
              <li key={slice.id ?? slice.name} className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.fill }}
                />
                <span className="min-w-0 flex-1 truncate text-xs">{slice.name}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatChartMoney(slice.value, format)}
                </span>
                <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
                  {total === 0 ? "0%" : `${Math.round((slice.value / total) * 100)}%`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ChartCard>
  );
}
