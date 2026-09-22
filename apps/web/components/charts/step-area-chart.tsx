"use client";

import * as React from "react";
import { Area, CartesianGrid, AreaChart as RechartsAreaChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { DottedPattern } from "./chart-patterns";
import { ChartState } from "./chart-state";
import type { CartesianChartProps, ChartDatum } from "./types";

export function StepAreaChart<TData extends ChartDatum>({
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
  const color = "var(--color-chart-2)";

  return (
    <ChartState
      title={title}
      status={status}
      errorMessage={errorMessage}
      isEmpty={data.length === 0}
      className={className}
    >
      <ChartContainer config={{ [valueKey]: { label: valueLabel, color } }} className="h-64 w-full">
        <RechartsAreaChart data={data} accessibilityLayer margin={{ top: 12, right: 8, left: -12 }}>
          <defs>
            <DottedPattern id={patternId} color={color} />
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey={categoryKey} tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis tickLine={false} axisLine={false} tickMargin={8} width={36} />
          <ChartTooltip
            content={
              <ChartTooltipContent formatter={(value) => formatValue?.(Number(value)) ?? value} />
            }
          />
          <Area
            type="stepAfter"
            dataKey={valueKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${patternId})`}
          />
        </RechartsAreaChart>
      </ChartContainer>
    </ChartState>
  );
}
