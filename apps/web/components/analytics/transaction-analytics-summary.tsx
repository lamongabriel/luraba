"use client";

import { ArrowDownLeft01Icon, ArrowUpRight01Icon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionAnalytics } from "@luraba/contracts";
import type { UseQueryResult } from "@tanstack/react-query";
import type * as React from "react";
import { ErrorState } from "@/components/error-state";
import { MoneyValue } from "@/components/finance/money-value";
import {
  KpiCard,
  KpiGrid,
  KpiGridSkeleton,
  KpiMobileSummary,
  KpiMobileSummarySkeleton,
  type KpiTone,
  type KpiTrendState,
} from "@/components/kpi";
import type { AppClientError } from "@/services/error-client";

type AnalyticsQuery = UseQueryResult<TransactionAnalytics, AppClientError>;

function comparisonState(value: number | null, inverse = false): KpiTrendState {
  if (value === null || value === 0) return "neutral";
  const isPositive = value > 0;
  return isPositive === inverse ? "negative" : "positive";
}

function changeHint(value: number | null) {
  return value === null ? undefined : `${value > 0 ? "+" : ""}${value}%`;
}

/**
 * Money in / out / net of the filtered transactions. Cards from `md` up; below it one compact text block
 * (`mobileAction` is the date filter, which sits on its title row).
 */
export function TransactionAnalyticsSummary({
  query,
  language = "en",
  precision = 2,
  mobileAction,
}: {
  query: AnalyticsQuery;
  language?: string;
  precision?: number;
  mobileAction?: React.ReactNode;
}) {
  if (query.isPending) {
    return (
      <>
        <div className="max-md:hidden">
          <KpiGridSkeleton columns={3} withDescription label="Loading transaction analytics" />
        </div>
        <KpiMobileSummarySkeleton action={mobileAction} label="Loading transaction analytics" />
      </>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="space-y-3">
        {/* The date filter stays reachable on a phone, where it lives in the summary block. */}
        <div className="flex justify-end md:hidden">{mobileAction}</div>
        <ErrorState
          title="Couldn&apos;t load transaction analytics"
          description={query.error?.message ?? "Try again to load the filtered totals."}
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const { currencyCode, metrics } = query.data;
  const cards = [
    {
      key: "moneyIn",
      title: "Money in",
      metric: metrics.moneyIn,
      inverse: false,
      icon: ArrowDownLeft01Icon,
      tone: "positive" as KpiTone,
    },
    {
      key: "moneyOut",
      title: "Money out",
      metric: metrics.moneyOut,
      inverse: true,
      icon: ArrowUpRight01Icon,
      tone: "negative" as KpiTone,
    },
    {
      key: "net",
      title: "Net",
      metric: metrics.net,
      inverse: false,
      icon: Wallet01Icon,
      // Net is neutral when flat, and takes the sign's color otherwise.
      tone: (metrics.net.value > 0
        ? "positive"
        : metrics.net.value < 0
          ? "negative"
          : "neutral") as KpiTone,
    },
  ];
  const money = (amount: number) => (
    <MoneyValue
      amount={amount}
      currencyCode={currencyCode}
      language={language}
      precision={precision}
    />
  );

  return (
    <>
      <KpiGrid columns={3} className="max-md:hidden">
        {cards.map(({ key, title, metric, inverse, icon, tone }) => (
          <KpiCard
            key={key}
            title={title}
            icon={<HugeiconsIcon icon={icon} strokeWidth={2} />}
            tone={tone}
            value={money(metric.value)}
            comparison={{
              value: metric.changePercent,
              label: "vs last period",
              state: comparisonState(metric.changePercent, inverse),
            }}
            trend={metric.trend}
          />
        ))}
      </KpiGrid>
      <KpiMobileSummary
        title="Summary"
        action={mobileAction}
        items={cards.map(({ title, metric, tone }) => ({
          label: title,
          tone,
          value: money(metric.value),
          hint: changeHint(metric.changePercent),
        }))}
      />
    </>
  );
}
