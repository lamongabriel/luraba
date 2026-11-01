"use client";

import * as React from "react";
import { Area, CartesianGrid, AreaChart as RechartsAreaChart, XAxis, YAxis } from "recharts";

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

export interface AreaChartCardProps extends Omit<ChartCardProps, "children" | "isEmpty"> {
  /** One row per point: `{ date: "2026-03-05", balance: 12345 }`, money in minor units. */
  data: Array<Record<string, string | number>>;
  series: MoneySeries[];
  currencyCode: string;
  precision?: number;
  language?: string;
  /** Key of the x value (a `YYYY-MM-DD` bucket start). Defaults to `date`. */
  xKey?: string;
  bucket?: ChartBucket;
  /** Stack the series instead of overlaying them. */
  stacked?: boolean;
}

/**
 * A time series as a filled line (balance history, net worth). Money values are minor units and are
 * formatted with the shared money helpers; an area with one point still draws as a dot.
 */
export function AreaChartCard({
  data,
  series,
  currencyCode,
  precision = 2,
  language = "en",
  xKey = "date",
  bucket = "day",
  stacked = false,
  heightClassName = CHART_HEIGHT_CLASS,
  ...card
}: AreaChartCardProps) {
  const gradientPrefix = React.useId().replace(/:/g, "");
  const format = { currencyCode, precision, language };
  const config = Object.fromEntries(
    series.map((item, index) => [
      item.key,
      { label: item.label, color: item.color ?? paletteColor(index) },
    ]),
  );
  const labels = Object.fromEntries(series.map((item) => [item.key, item.label]));

  return (
    <ChartCard {...card} heightClassName={heightClassName} isEmpty={data.length === 0}>
      <ChartContainer config={config} className={`${heightClassName} w-full`}>
        <RechartsAreaChart data={data} accessibilityLayer margin={{ top: 8, right: 8, left: 0 }}>
          <defs>
            {series.map((item) => (
              <linearGradient
                key={item.key}
                id={`${gradientPrefix}-${item.key}`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="5%" stopColor={`var(--color-${item.key})`} stopOpacity={0.4} />
                <stop offset="95%" stopColor={`var(--color-${item.key})`} stopOpacity={0.03} />
              </linearGradient>
            ))}
          </defs>
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
            content={
              <ChartTooltipBody
                labels={labels}
                formatTitle={(value) => formatChartDateLabel(value, bucket, language)}
                formatValue={(value) => formatChartMoney(value, format)}
              />
            }
          />
          {series.map((item) => (
            <Area
              key={item.key}
              type="monotone"
              dataKey={item.key}
              stackId={stacked ? "stack" : undefined}
              stroke={`var(--color-${item.key})`}
              strokeWidth={2}
              fill={`url(#${gradientPrefix}-${item.key})`}
              isAnimationActive={false}
            />
          ))}
        </RechartsAreaChart>
      </ChartContainer>
    </ChartCard>
  );
}
