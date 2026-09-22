"use client";

import * as React from "react";
import { Area, CartesianGrid, AreaChart as RechartsAreaChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { StripePattern } from "./chart-patterns";
import { ChartState } from "./chart-state";
import type { CartesianChartProps, ChartDatum } from "./types";

export function GradientAreaChart<TData extends ChartDatum>({
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
  const id = React.useId().replace(/:/g, "");
  const gradientId = `area-gradient-${id}`;
  const stripeId = `area-stripes-${id}`;
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
        <RechartsAreaChart data={data} accessibilityLayer margin={{ top: 12, right: 8, left: -12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.48} />
              <stop offset="95%" stopColor={color} stopOpacity={0.04} />
            </linearGradient>
            <StripePattern id={stripeId} color="var(--color-card)" />
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
            type="monotone"
            dataKey={valueKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
          />
          <Area
            type="monotone"
            dataKey={valueKey}
            stroke="none"
            fill={`url(#${stripeId})`}
            fillOpacity={0.4}
          />
        </RechartsAreaChart>
      </ChartContainer>
    </ChartState>
  );
}
