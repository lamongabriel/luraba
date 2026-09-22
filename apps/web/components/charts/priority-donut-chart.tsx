"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { StripePattern } from "./chart-patterns";
import { ChartState } from "./chart-state";
import type { DonutChartProps } from "./types";

const FALLBACK_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function PriorityDonutChart({
  data,
  valueLabel = "Value",
  formatValue,
  title,
  status = "ready",
  errorMessage,
  className,
}: DonutChartProps) {
  const id = React.useId().replace(/:/g, "");
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length],
  }));

  return (
    <ChartState
      title={title}
      status={status}
      errorMessage={errorMessage}
      isEmpty={data.length === 0}
      className={className}
    >
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)] sm:items-center">
        <ChartContainer
          config={{ value: { label: valueLabel, color: FALLBACK_COLORS[0] } }}
          className="h-64 w-full"
        >
          <PieChart accessibilityLayer>
            <defs>
              {chartData.map((item, index) => (
                <StripePattern
                  id={`donut-stripes-${id}-${index}`}
                  color={item.color}
                  key={item.name}
                />
              ))}
            </defs>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="name"
                  formatter={(value) => formatValue?.(Number(value)) ?? value}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="82%"
              paddingAngle={3}
              stroke="var(--color-card)"
              strokeWidth={2}
            >
              {chartData.map((item, index) => (
                <Cell fill={`url(#donut-stripes-${id}-${index})`} key={item.name} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <ul className="grid gap-2" aria-label={`${title} categories`}>
          {chartData.map((item) => (
            <li className="flex min-w-0 items-center gap-2" key={item.name}>
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-xs">{item.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatValue?.(item.value) ?? item.value.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartState>
  );
}
