"use client";

import { Bar, CartesianGrid, BarChart as RechartsBarChart, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { ChartState } from "./chart-state";
import type { CartesianChartProps, ChartDatum } from "./types";

export function VerticalBarChart<TData extends ChartDatum>({
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
        <RechartsBarChart
          data={data}
          layout="vertical"
          accessibilityLayer
          margin={{ top: 4, right: 16, bottom: 4, left: 16 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
          <YAxis
            type="category"
            dataKey={categoryKey}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={88}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent formatter={(value) => formatValue?.(Number(value)) ?? value} />
            }
          />
          <Bar dataKey={valueKey} radius={[0, 5, 5, 0]} fill={color} />
        </RechartsBarChart>
      </ChartContainer>
    </ChartState>
  );
}
