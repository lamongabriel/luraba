"use client";

import { Bar, CartesianGrid, Cell, ComposedChart, Line, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip } from "@/components/ui/chart";

import { ChartCard, type ChartCardProps } from "./chart-card";
import {
  type ChartBucket,
  formatChartAxisMoney,
  formatChartDate,
  formatChartDateLabel,
  formatChartMoney,
} from "./chart-format";
import { CHART_HEIGHT_CLASS, paletteColor } from "./chart-theme";
import { ChartTooltipBody } from "./chart-tooltip";
import type { MoneySeries } from "./types";

export interface BarChartCardProps extends Omit<ChartCardProps, "children" | "isEmpty"> {
  /** One row per bar group: `{ date: "2026-03-01", moneyIn: 5000, moneyOut: 3000 }`, minor units. */
  data: Array<Record<string, string | number>>;
  series: MoneySeries[];
  /** Series drawn as a dashed line over the bars (a budget or target per bar group). */
  lineSeries?: MoneySeries[];
  currencyCode: string;
  precision?: number;
  language?: string;
  xKey?: string;
  bucket?: ChartBucket;
  /** Stack the series in one bar instead of grouping them side by side. */
  stacked?: boolean;
  /** Color of one row's bar (invoice status colors); defaults to the series color. */
  getBarColor?: (row: Record<string, string | number>, seriesKey: string) => string | undefined;
  /** Makes bars clickable (pick an invoice). Receives the clicked row. */
  onBarClick?: (row: Record<string, string | number>) => void;
  /** Rows for which this is false are dimmed, so the selected bar stands out. */
  isRowActive?: (row: Record<string, string | number>) => boolean;
}

/** Grouped or stacked bars over time (cash flow: income vs expense per day, week or month). */
export function BarChartCard({
  data,
  series,
  lineSeries = [],
  currencyCode,
  precision = 2,
  language = "en",
  xKey = "date",
  bucket = "day",
  stacked = false,
  getBarColor,
  onBarClick,
  isRowActive,
  heightClassName = CHART_HEIGHT_CLASS,
  ...card
}: BarChartCardProps) {
  const format = { currencyCode, precision, language };
  const config = Object.fromEntries(
    [...series, ...lineSeries].map((item, index) => [
      item.key,
      { label: item.label, color: item.color ?? paletteColor(index) },
    ]),
  );
  const labels = Object.fromEntries(
    [...series, ...lineSeries].map((item) => [item.key, item.label]),
  );

  return (
    <ChartCard {...card} heightClassName={heightClassName} isEmpty={data.length === 0}>
      <ChartContainer config={config} className={`${heightClassName} w-full`}>
        <ComposedChart data={data} accessibilityLayer margin={{ top: 8, right: 8, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
            tickFormatter={(value: string) => formatChartDate(value, bucket, language)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            tickFormatter={(value: number) => formatChartAxisMoney(value, format)}
          />
          <ChartTooltip
            cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
            content={
              <ChartTooltipBody
                labels={labels}
                formatTitle={(value) => formatChartDateLabel(value, bucket, language)}
                formatValue={(value) => formatChartMoney(value, format)}
              />
            }
          />
          {series.map((item) => (
            <Bar
              key={item.key}
              dataKey={item.key}
              fill={`var(--color-${item.key})`}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? 0 : [3, 3, 0, 0]}
              maxBarSize={28}
              isAnimationActive={false}
              className={onBarClick ? "cursor-pointer" : undefined}
              onClick={
                onBarClick
                  ? (entry) => onBarClick(entry as unknown as Record<string, string | number>)
                  : undefined
              }
            >
              {getBarColor || isRowActive
                ? data.map((row) => (
                    <Cell
                      key={String(row[xKey])}
                      fill={getBarColor?.(row, item.key) ?? `var(--color-${item.key})`}
                      fillOpacity={isRowActive && !isRowActive(row) ? 0.45 : 1}
                    />
                  ))
                : null}
            </Bar>
          ))}
          {lineSeries.map((item) => (
            <Line
              key={item.key}
              dataKey={item.key}
              type="monotone"
              stroke={`var(--color-${item.key})`}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, strokeWidth: 0, fill: `var(--color-${item.key})` }}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ChartContainer>
    </ChartCard>
  );
}
