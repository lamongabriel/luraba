"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { MoneyValue } from "@/components/finance/money-value";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Typography } from "@/components/ui/typography";
import { ValueChange } from "@/components/ui/value-change";
import { formatCurrency, formatMonthLabel } from "@/lib/finance";
import { showcaseUser } from "@/lib/mock-data";

type NetWorthPoint = {
  month: string;
  amount: number;
};

const chartConfig = {
  netWorth: {
    label: "Net worth",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const gridFadeStyle = {
  WebkitMaskImage:
    "linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.82) 56%, rgba(0, 0, 0, 0.28) 82%, transparent 100%)",
  maskImage:
    "linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.82) 56%, rgba(0, 0, 0, 0.28) 82%, transparent 100%)",
};

export function NetWorthChart({ data }: { data: readonly NetWorthPoint[] }) {
  const currentValue = data.at(-1)?.amount ?? 0;
  const startingValue = data.at(0)?.amount ?? currentValue;
  const percentageChange =
    startingValue === 0 ? 0 : ((currentValue - startingValue) / startingValue) * 100;

  const values = data.map((point) => point.amount);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 0;

  const padding = Math.max((maxValue - minValue) * 0.18, 120000);

  const chartData = data.map((point) => ({
    month: point.month,
    netWorth: point.amount,
  }));

  return (
    <section className="flex flex-col">
      <div className="py-6 px-8">
        <Typography variant="eyebrow">Net worth</Typography>

        <MoneyValue
          amount={currentValue}
          currencyCode={showcaseUser.currencyCode}
          className="mt-3 block text-4xl font-semibold tracking-[-0.05em] text-foreground md:text-6xl"
        />
        <ValueChange
          value={percentageChange}
          label="over this period"
          className="mt-3"
        />
      </div>

      <ChartContainer
        config={chartConfig}
        className="mt-8 h-[240px] w-full aspect-auto"
      >
        <AreaChart
          accessibilityLayer
          data={chartData}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeOpacity={0.8}
            style={gridFadeStyle}
            vertical={false}
          />

          <XAxis
            dataKey="month"
            hide
            padding={{ left: 0, right: 0 }}
          />

          <YAxis
            hide
            width={0}
            domain={[Math.max(0, minValue - padding), maxValue]}
          />

          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeDasharray: "4 6" }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(value) =>
                  formatMonthLabel(String(value), showcaseUser.language)
                }
                formatter={(value) => (
                  <div className="flex min-w-[200px] items-center justify-between gap-6">
                    <span className="text-muted-foreground">Net worth</span>

                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatCurrency(
                        Number(value),
                        showcaseUser.currencyCode,
                        showcaseUser.language,
                      )}
                    </span>
                  </div>
                )}
              />
            }
          />

          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="var(--color-netWorth)"
            strokeWidth={2.5}
            fill="var(--color-netWorth)"
            fillOpacity={0.08}
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--color-netWorth)",
              strokeWidth: 0,
            }}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
