"use client";

import type { GoalTimelinePoint } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import {
  CartesianGrid,
  Line,
  ComposedChart as RechartsComposedChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency, minorToMajorUnits } from "@/lib/finance";

/** What was saved so far (solid) and where the monthly plan leads (dashed), against the target. */
export function GoalProgressChart({
  timeline,
  targetAmount,
  currencyCode,
  language,
}: {
  timeline: GoalTimelinePoint[];
  targetAmount: number;
  currencyCode: string;
  language: string;
}) {
  const data = timeline.map((point) => ({
    ...point,
    label: formatShortDate(point.date, language),
  }));
  const format = (value: number) => formatCurrency(value, currencyCode, language);

  return (
    <ChartContainer
      config={{
        actual: { label: "Saved", color: "var(--color-chart-1)" },
        projected: { label: "Plan", color: "var(--color-chart-2)" },
      }}
      className="h-64 w-full"
    >
      <RechartsComposedChart
        data={data}
        accessibilityLayer
        margin={{ top: 12, right: 8, left: -4 }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={52}
          domain={[0, (max: number) => Math.max(max, targetAmount)]}
          tickFormatter={(value: number) =>
            new Intl.NumberFormat(language, { notation: "compact" }).format(
              minorToMajorUnits(value, 2),
            )
          }
        />
        <ReferenceLine
          y={targetAmount}
          stroke="var(--color-muted-foreground)"
          strokeDasharray="4 4"
        />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value) => format(Number(value))} />}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="projected"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          connectNulls
        />
      </RechartsComposedChart>
    </ChartContainer>
  );
}
