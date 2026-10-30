"use client";

import type { InvestmentDashboard } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartState } from "@/components/charts/chart-state";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { formatCurrency } from "@/lib/finance";

import { useInvestmentFormat } from "./use-investment-format";

/** Portfolio value against money invested (and a benchmark when one is chosen). */
export function PerformanceChart({
  history,
  currencyCode,
  benchmarkLabel,
  status = "ready",
  className,
}: {
  history: InvestmentDashboard["history"];
  currencyCode: string;
  benchmarkLabel?: string;
  status?: "ready" | "loading" | "error";
  className?: string;
}) {
  const format = useInvestmentFormat();
  const precision = format.precisionOf(currencyCode);
  const hasBenchmark = history.some((point) => point.benchmark !== null);
  const data = history.map((point) => ({
    date: point.date,
    value: point.value,
    invested: point.invested,
    benchmark: point.benchmark,
  }));
  const money = (value: number) =>
    formatCurrency(value, currencyCode, format.language, undefined, precision);

  return (
    <ChartState
      title="Portfolio value"
      status={status}
      isEmpty={data.length === 0}
      className={className}
    >
      <ChartContainer
        config={{
          value: { label: "Value", color: "var(--color-chart-1)" },
          invested: { label: "Invested", color: "var(--color-chart-3)" },
          benchmark: { label: benchmarkLabel ?? "Benchmark", color: "var(--color-chart-2)" },
        }}
        className="h-72 w-full"
      >
        <LineChart data={data} accessibilityLayer margin={{ top: 12, right: 8, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(value: string) => formatShortDate(value, format.language)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={64}
            tickFormatter={(value: number) => money(value)}
          />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value) => money(Number(value))} />}
          />
          <Line dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot={false} />
          <Line
            dataKey="invested"
            stroke="var(--color-invested)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
          {hasBenchmark ? (
            <Line
              dataKey="benchmark"
              stroke="var(--color-benchmark)"
              strokeWidth={1.5}
              dot={false}
            />
          ) : null}
        </LineChart>
      </ChartContainer>
    </ChartState>
  );
}
