"use client";

import type { ReactNode } from "react";
import { Area, AreaChart } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type KpiTrendState = "positive" | "negative" | "neutral";

/** The semantic color of a card: its icon tile and sparkline. `neutral` is the default; `primary` is the brand color. */
export type KpiTone = "neutral" | "positive" | "negative" | "primary";

export interface KpiCardProps {
  title: string;
  /** The headline number. Children work too, for values built from several parts. */
  value?: ReactNode;
  /** Several parts (one amount per currency) stack under each other with a gap, never glued. */
  children?: ReactNode;
  /** A smaller, muted line right under the value: "of $500", a delta, a second figure. */
  secondary?: ReactNode;
  /** A glyph shown in a tinted tile at the top right, colored by `tone`. */
  icon?: ReactNode;
  /** Colors the icon tile and the sparkline: green for money in, red for money out. Default `neutral`. */
  tone?: KpiTone;
  description?: ReactNode;
  comparison?: {
    value: number | null;
    label?: string;
    state?: KpiTrendState;
  };
  trend?: Array<{ date: string; value: number }>;
  /** Extra classes for the card, e.g. a status border and tint. */
  className?: string;
}

const trendClasses: Record<KpiTrendState, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
};

/** Tile + sparkline color per tone. Light and dark values both keep 4.5:1 against the card. */
export const KPI_TONE_CLASSES: Record<KpiTone, { tile: string; line: string }> = {
  neutral: { tile: "bg-muted text-muted-foreground", line: "text-muted-foreground" },
  positive: {
    tile: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
    line: "text-emerald-600 dark:text-emerald-400",
  },
  negative: {
    tile: "bg-rose-500/12 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300",
    line: "text-rose-600 dark:text-rose-400",
  },
  primary: { tile: "bg-primary/10 text-primary", line: "text-primary" },
};

/** Height every KPI card (and its skeleton) shares, so loading never shifts the page. */
export const KPI_CARD_MIN_HEIGHT = "min-h-[6.25rem]";
/** The card chrome shared by `KpiCard` and `KpiCardSkeleton`. */
const KPI_CARD_BASE = "relative isolate gap-1.5 overflow-hidden py-3";

export function KpiCard({
  title,
  value,
  children,
  secondary,
  icon,
  tone = "neutral",
  description,
  comparison,
  trend = [],
  className,
}: KpiCardProps) {
  const state = comparison?.state ?? "neutral";
  const comparisonText =
    comparison?.value === null || comparison?.value === undefined
      ? null
      : `${comparison.value > 0 ? "+" : ""}${comparison.value}%${comparison.label ? ` ${comparison.label}` : ""}`;

  const trendLabel = `${title} trend chart`;
  const lineClass = tone === "neutral" ? trendClasses[state] : KPI_TONE_CLASSES[tone].line;

  return (
    <Card aria-label={title} className={cn(KPI_CARD_BASE, KPI_CARD_MIN_HEIGHT, className)}>
      <CardHeader className="relative z-10 flex h-6 flex-row items-center justify-between gap-3 px-3.5">
        <CardTitle className="truncate text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5",
              KPI_TONE_CLASSES[tone].tile,
            )}
          >
            {icon}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="relative z-10 px-3.5">
        <div className={cn("min-w-0", trend.length > 1 && "max-w-[62%]")}>
          <div className="flex flex-col items-start gap-1 text-xl leading-7 font-bold tracking-tight tabular-nums">
            {value ?? children}
          </div>
          {secondary ? (
            <div className="mt-1 text-xs font-normal text-muted-foreground">{secondary}</div>
          ) : null}
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          {comparisonText ? (
            <p className={cn("mt-0.5 truncate text-xs font-medium", trendClasses[state])}>
              {comparisonText}
            </p>
          ) : null}
        </div>
      </CardContent>
      {trend.length > 1 ? (
        <ChartContainer
          config={{ value: { label: title, color: "var(--color-primary)" } }}
          className={cn(
            "pointer-events-none absolute right-3 bottom-2 h-[52%] w-[38%] opacity-60 [mask-image:linear-gradient(to_right,transparent_0%,black_38%,black_100%)]",
            lineClass,
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
    <Card aria-hidden="true" className={cn(KPI_CARD_BASE, KPI_CARD_MIN_HEIGHT)}>
      <CardHeader className="relative z-10 flex h-6 flex-row items-center justify-between gap-3 px-3.5">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="size-6 rounded-md" />
      </CardHeader>
      <CardContent className="relative z-10 px-3.5">
        <Skeleton className="h-7 w-28" />
        {withDescription ? <Skeleton className="mt-1 h-4 w-36" /> : null}
      </CardContent>
    </Card>
  );
}
