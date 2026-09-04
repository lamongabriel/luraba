"use client"

import type { TransactionAnalytics } from "@luraba/contracts"
import type { UseQueryResult } from "@tanstack/react-query"
import { KpiCard, type KpiTrendState } from "@/components/analytics/kpi-card"
import { ErrorState } from "@/components/error-state"
import { MoneyValue } from "@/components/finance/money-value"
import { Skeleton } from "@/components/ui/skeleton"
import type { AppClientError } from "@/services/error-client"

type AnalyticsQuery = UseQueryResult<TransactionAnalytics, AppClientError>

function comparisonState(value: number | null, inverse = false): KpiTrendState {
  if (value === null || value === 0) return "neutral"
  const isPositive = value > 0
  return isPositive === inverse ? "negative" : "positive"
}

export function TransactionAnalyticsSummary({
  query,
  language = "en",
  precision = 2,
}: {
  query: AnalyticsQuery
  language?: string
  precision?: number
}) {
  if (query.isPending) {
    return (
      <div
        className="grid gap-3 md:grid-cols-3"
        aria-busy="true"
        aria-label="Loading transaction analytics"
        role="status"
      >
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
    )
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="Couldn&apos;t load transaction analytics"
        description={
          query.error?.message ?? "Try again to load the filtered totals."
        }
        onRetry={() => void query.refetch()}
      />
    )
  }

  const { currencyCode, metrics } = query.data
  const cards = [
    {
      key: "moneyIn",
      title: "Money in",
      metric: metrics.moneyIn,
      inverse: false,
    },
    {
      key: "moneyOut",
      title: "Money out",
      metric: metrics.moneyOut,
      inverse: true,
    },
    { key: "net", title: "Net", metric: metrics.net, inverse: false },
  ] as const

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map(({ key, title, metric, inverse }) => (
        <KpiCard
          key={key}
          title={title}
          value={
            <MoneyValue
              amount={metric.value}
              currencyCode={currencyCode}
              language={language}
              precision={precision}
            />
          }
          comparison={{
            value: metric.changePercent,
            label: "vs previous period",
            state: comparisonState(metric.changePercent, inverse),
          }}
          trend={metric.trend}
        />
      ))}
    </div>
  )
}
