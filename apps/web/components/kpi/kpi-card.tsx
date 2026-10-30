"use client";

import type { ReactNode } from "react";
import { Area, AreaChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type KpiTrendState = "positive" | "negative" | "neutral";

export interface KpiCardProps {
  title: string;
  /** The headline number. Children work too, for values built from several parts. */
  value?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  comparison?: {
    value: number | null;
    label?: string;
    state?: KpiTrendState;
  };
  trend?: Array<{ date: string; value: number }>;
}

const trendClasses: Record<KpiTrendState, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
};

/** Height every KPI card (and its skeleton) shares, so loading never shifts the page. */
export const KPI_CARD_MIN_HEIGHT = "min-h-32";

export function KpiCard({
  title,
  value,
  children,
  icon,
  description,
  comparison,
  trend = [],
}: KpiCardProps) {
  const state = comparison?.state ?? "neutral";
  const comparisonText =
    comparison?.value === null || comparison?.value === undefined
      ? null
      : `${comparison.value > 0 ? "+" : ""}${comparison.value}%${comparison.label ? ` ${comparison.label}` : ""}`;

  const trendLabel = `${title} trend chart`;

  return (
    <Card
      aria-label={title}
      className={cn("relative isolate overflow-hidden", KPI_CARD_MIN_HEIGHT)}
    >
      <CardHeader className="relative z-10 flex flex-row items-start justify-between gap-3 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{title}</CardTitle>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className={cn("min-w-0", trend.length > 1 && "max-w-[60%]")}>
          <div className="text-xl font-semibold tracking-tight">{value ?? children}</div>
          {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
          {comparisonText ? (
            <p className={cn("mt-2 text-xs font-medium", trendClasses[state])}>{comparisonText}</p>
          ) : null}
        </div>
      </CardContent>
      {trend.length > 1 ? (
        <ChartContainer
          config={{ value: { label: title, color: "var(--color-primary)" } }}
          className={cn(
            "pointer-events-none absolute top-1/2 right-4 h-[72%] w-[42%] -translate-y-1/2 opacity-60 [mask-image:linear-gradient(to_right,transparent_0%,black_38%,black_100%)]",
            trendClasses[state],
          )}
          aria-label={trendLabel}
        >
          <AreaChart
            data={trend}
            accessibilityLayer
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <Area
              type="monotone"
              dataKey="value"
              stroke="currentColor"
              fill="currentColor"
              fillOpacity={0.1}
              strokeWidth={1.75}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      ) : null}
    </Card>
  );
}

/** The loading twin of `KpiCard`: same card, header and value rows, so nothing moves on load. */
export function KpiCardSkeleton({ withDescription = false }: { withDescription?: boolean }) {
  return (
    <Card
      aria-hidden="true"
      className={cn("relative isolate overflow-hidden", KPI_CARD_MIN_HEIGHT)}
    >
      <CardHeader className="relative z-10 flex flex-row items-start justify-between gap-3 pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="relative z-10">
        <Skeleton className="h-7 w-32" />
        {withDescription ? <Skeleton className="mt-1.5 h-4 w-40" /> : null}
      </CardContent>
    </Card>
  );
}
