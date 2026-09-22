"use client";

import * as React from "react";
import { Bar, CartesianGrid, BarChart as RechartsBarChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { DottedPattern } from "./chart-patterns";
import { ChartState } from "./chart-state";
import type { CartesianChartProps, ChartDatum } from "./types";

export function DottedBarChart<TData extends ChartDatum>({
  data,
  categoryKey,
  valueKey,
  valueLabel = "Value",
  formatValue,
  title,
  status = "ready",
  errorMessage,
  className,
}: CartesianChartProps<TData>) {
  const patternId = React.useId().replace(/:/g, "");
  const color = "var(--color-chart-1)";

  return (
    <ChartState
      title={title}
      status={status}
      errorMessage={errorMessage}
      isEmpty={data.length === 0}
      className={className}
    >
      <ChartContainer config={{ [valueKey]: { label: valueLabel, color } }} className="h-64 w-full">
        <RechartsBarChart data={data} accessibilityLayer margin={{ top: 12, right: 8, left: -12 }}>
          <defs>
            <DottedPattern id={patternId} color={color} />
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
          <ChartTooltip
            cursor={{ fill: "var(--color-muted)" }}
            content={
              <ChartTooltipContent formatter={(value) => formatValue?.(Number(value)) ?? value} />
            }
          />
          <Bar dataKey={valueKey} radius={[5, 5, 0, 0]} fill={`url(#${patternId})`} />
        </RechartsBarChart>
      </ChartContainer>
    </ChartState>
  );
}
