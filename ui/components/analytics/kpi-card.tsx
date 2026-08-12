"use client"

import type { ReactNode } from "react"
import { Area, AreaChart } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { cn } from "@/lib/utils"

export type KpiTrendState = "positive" | "negative" | "neutral"

export interface KpiCardProps {
  title: string
  value: ReactNode
  icon?: ReactNode
  description?: ReactNode
  comparison?: {
    value: number | null
    label?: string
    state?: KpiTrendState
  }
  trend?: Array<{ date: string; value: number }>
}

const trendClasses: Record<KpiTrendState, string> = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
}

export function KpiCard({
  title,
  value,
  icon,
  description,
  comparison,
  trend = [],
}: KpiCardProps) {
  const state = comparison?.state ?? "neutral"
  const comparisonText =
    comparison?.value === null || comparison?.value === undefined
      ? null
      : `${comparison.value > 0 ? "+" : ""}${comparison.value}%${comparison.label ? ` ${comparison.label}` : ""}`

  const trendLabel = `${title} trend chart`

  return (
    <Card
      aria-label={title}
      className="relative isolate min-h-32 overflow-hidden"
    >
      <CardHeader className="relative z-10 flex flex-row items-start justify-between gap-3 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="min-w-0 max-w-[60%]">
          <div className="text-xl font-semibold tracking-tight">{value}</div>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
          {comparisonText ? (
            <p className={cn("mt-2 text-xs font-medium", trendClasses[state])}>
              {comparisonText}
            </p>
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
  )
}
