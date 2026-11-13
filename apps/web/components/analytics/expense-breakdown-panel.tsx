"use client";

import { PieChart01Icon as PieChartIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionAnalytics } from "@luraba/contracts";
import * as React from "react";
import { Pie, PieChart, Sector } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";
import { EmptyState } from "@/components/empty-state";
import { PanelCard } from "@/components/finance/panel-card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/finance";
import { CURATED_COLOR_PRESETS } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function ExpenseBreakdownPanel({
  analytics,
  language = "en",
  precision = 2,
}: {
  analytics: TransactionAnalytics;
  language?: string;
  precision?: number;
}) {
  const [kind, setKind] = React.useState<"expense" | "income">("expense");
  const items = (kind === "expense" ? analytics.expenseBreakdown : analytics.incomeBreakdown).items;
  const [activeIndex, setActiveIndex] = React.useState(0);
  const chartItems = items.map((item, index) => ({
    ...item,
    fill: item.color ?? CURATED_COLOR_PRESETS[index % CURATED_COLOR_PRESETS.length],
  }));

  return (
    <PanelCard
      title={kind === "expense" ? "Expense breakdown" : "Income breakdown"}
      actions={
        <div className="flex rounded-full bg-muted p-0.5 text-xs">
          {(["expense", "income"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={kind === value}
              onClick={() => {
                setKind(value);
                setActiveIndex(0);
              }}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium capitalize transition-colors",
                kind === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground",
              )}
            >
              {value}
            </button>
          ))}
        </div>
      }
      icon={<HugeiconsIcon icon={PieChartIcon} strokeWidth={2} />}
      contentClassName="space-y-4"
    >
      {chartItems.length === 0 ? (
        <EmptyState
          variant="embedded"
          icon={<HugeiconsIcon icon={PieChartIcon} strokeWidth={1.8} className="size-5" />}
          title={kind === "expense" ? "No expenses in this period" : "No income in this period"}
          description={
            kind === "expense"
              ? "Expenses you add or import show up here by category."
              : "Income you add or import shows up here by category."
          }
        />
      ) : (
        <>
          <ChartContainer
            config={{
              amount: { label: "Amount", color: "var(--color-primary)" },
            }}
            className="mx-auto aspect-square w-full max-w-52"
          >
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartItems}
                dataKey="amount"
                nameKey="name"
                innerRadius="62%"
                outerRadius="88%"
                strokeWidth={2}
                stroke="var(--color-card)"
                shape={({ index, outerRadius = 0, ...props }: PieSectorShapeProps) =>
                  index === activeIndex ? (
                    <Sector {...props} outerRadius={outerRadius + 5} />
                  ) : (
                    <Sector {...props} outerRadius={outerRadius} />
                  )
                }
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(0)}
                isAnimationActive={false}
              />
            </PieChart>
          </ChartContainer>
          <ul
            className="space-y-2"
            aria-label={kind === "expense" ? "Expense categories" : "Income categories"}
          >
            {chartItems.map((item) => (
              <li key={item.id ?? "uncategorized"} className="flex items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: item.fill }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-xs">{item.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(
                    item.amount,
                    analytics.currencyCode,
                    language,
                    undefined,
                    precision,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </PanelCard>
  );
}

/** Loading twin of `ExpenseBreakdownPanel`: the same card, header, donut and a handful of category rows. */
export function ExpenseBreakdownSkeleton() {
  return (
    <PanelCard
      title={<Skeleton className="h-5 w-36" />}
      icon={<Skeleton className="size-6 rounded-md" />}
      iconFrame={false}
      contentClassName="space-y-4"
    >
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading expense breakdown"
        className="space-y-4"
      >
        <Skeleton className="mx-auto aspect-square w-full max-w-52 rounded-full" />
        <ul className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
            <li key={index} className="flex items-center gap-2">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-14" />
            </li>
          ))}
        </ul>
      </div>
    </PanelCard>
  );
}
