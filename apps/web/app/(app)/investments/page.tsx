"use client";
import type { Benchmark } from "@luraba/contracts";
import { BENCHMARKS } from "@luraba/contracts";
import { keepPreviousData } from "@tanstack/react-query";
import Link from "next/link";
import * as React from "react";

import { AmountDisplay } from "@/components/display";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { AllocationChart } from "@/components/investments/allocation-chart";
import { BENCHMARK_LABELS, PERIOD_LABELS } from "@/components/investments/constants";
import { CorporateActionSuggestions } from "@/components/investments/corporate-action-suggestions";
import { FreshnessBadge } from "@/components/investments/freshness-badge";
import { MoversList } from "@/components/investments/movers-list";
import { PercentChange } from "@/components/investments/percent-change";
import { PerformanceChart } from "@/components/investments/performance-chart";
import { PositionsTable } from "@/components/investments/positions-table";
import { ScopeBar } from "@/components/investments/scope-bar";
import { SegmentedControl } from "@/components/investments/segmented-control";
import { UpcomingList } from "@/components/investments/upcoming-list";
import { useInvestmentFormat } from "@/components/investments/use-investment-format";
import { scopeQuery, useInvestmentScope } from "@/components/investments/use-investment-scope";
import { KpiCard, KpiGrid } from "@/components/kpi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useInvestmentDashboardQuery,
  usePositionsQuery,
} from "@/queries/investments/use-investments-queries";
import { useDefaultCurrencyCode } from "@/stores/auth-session-store";
import { InvestmentsEmpty } from "./_empty";
import { InvestmentsError } from "./_error";
import { InvestmentsLoading } from "./_loading";

const NO_BENCHMARK = "none";
const ALLOCATION_VIEWS = [
  { value: "class", label: "Class" },
  { value: "sector", label: "Sector" },
  { value: "country", label: "Country" },
  { value: "currency", label: "Currency" },
] as const;

export default function InvestmentsPage() {
  const format = useInvestmentFormat();
  const scope = useInvestmentScope();
  const [benchmark, setBenchmark] = React.useState<Benchmark | null>(null);
  const [allocationView, setAllocationView] =
    React.useState<(typeof ALLOCATION_VIEWS)[number]["value"]>("class");

  const dashboard = useInvestmentDashboardQuery(
    { ...scopeQuery(scope), period: scope.period, benchmark: benchmark ?? undefined },
    { placeholderData: keepPreviousData },
  );
  const positions = usePositionsQuery(scopeQuery(scope), { placeholderData: keepPreviousData });

  const data = dashboard.data;
  const defaultCurrency = useDefaultCurrencyCode();
  const currencyCode = data?.reportingCurrencyCode ?? defaultCurrency;
  const precision = format.precisionOf(currencyCode);
  const money = (amount: number, kind: "neutral" | "auto" = "neutral") => (
    <AmountDisplay
      amount={amount}
      currencyCode={currencyCode}
      precision={precision}
      language={format.language}
      kind={kind}
      size="md"
    />
  );
  const isEmpty =
    data !== undefined && data.marketValue === 0 && data.invested === 0 && data.cash === 0;

  let content: React.ReactNode;
  if (dashboard.isPending) {
    content = <InvestmentsLoading />;
  } else if (dashboard.isError || !data) {
    content = (
      <InvestmentsError
        message={dashboard.error?.message}
        onRetry={() => void dashboard.refetch()}
      />
    );
  } else if (isEmpty && (positions.data?.length ?? 0) === 0) {
    content = <InvestmentsEmpty />;
  } else {
    const value = (scope.net ? data.netValue : data.marketValue) + data.cash;
    content = (
      <div className="space-y-4">
        <KpiGrid columns={4}>
          <KpiCard
            title={scope.net ? "Net value" : "Total value"}
            value={money(value)}
            description={
              <span>
                Positions {money(scope.net ? data.netValue : data.marketValue)} · cash{" "}
                {money(data.cash)}
              </span>
            }
          />
          <KpiCard
            title="Invested"
            value={money(data.invested)}
            description={`${format.percent(data.xirr)} annualized (XIRR)`}
          />
          <KpiCard
            title="Unrealized P&L"
            value={money(data.unrealizedPnl, "auto")}
            description={<PercentChange value={data.unrealizedPnlPercent} />}
          />
          <KpiCard
            title="Today"
            value={money(data.todayChange, "auto")}
            description={<PercentChange value={data.todayChangePercent} />}
          />
        </KpiGrid>

        <KpiGrid columns={4}>
          <KpiCard title="Realized P&L" value={money(data.realizedPnl, "auto")} />
          <KpiCard
            title="Income (last 12 months)"
            value={money(data.income.last12Months)}
            description={<span>Year to date {money(data.income.ytd)}</span>}
          />
          <KpiCard
            title={`Return (${PERIOD_LABELS[scope.period]}, time-weighted)`}
            value={data.twr === null ? "—" : <PercentChange value={data.twr} />}
          />
          <KpiCard
            title={
              benchmark
                ? `${BENCHMARK_LABELS[benchmark]} (${PERIOD_LABELS[scope.period]})`
                : "Benchmark"
            }
            value={
              data.benchmarkReturn === null ? "—" : <PercentChange value={data.benchmarkReturn} />
            }
            description={benchmark ? undefined : "Pick a benchmark to compare"}
          />
        </KpiGrid>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle>Performance</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={benchmark ?? NO_BENCHMARK}
                onValueChange={(next) =>
                  setBenchmark(next === NO_BENCHMARK ? null : (next as Benchmark))
                }
              >
                <SelectTrigger className="w-36" aria-label="Benchmark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BENCHMARK}>No benchmark</SelectItem>
                  {BENCHMARKS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {BENCHMARK_LABELS[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SegmentedControl
                label="Period"
                value={scope.period}
                onChange={scope.setPeriod}
                options={Object.entries(PERIOD_LABELS).map(([period, label]) => ({
                  value: period as keyof typeof PERIOD_LABELS,
                  label,
                }))}
              />
            </div>
          </CardHeader>
          <CardContent>
            <PerformanceChart
              history={data.history}
              currencyCode={currencyCode}
              benchmarkLabel={benchmark ? BENCHMARK_LABELS[benchmark] : undefined}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle>Allocation</CardTitle>
              <SegmentedControl
                label="Allocation by"
                value={allocationView}
                onChange={setAllocationView}
                options={ALLOCATION_VIEWS}
              />
            </CardHeader>
            <CardContent>
              <AllocationChart
                title="Allocation"
                slices={data.allocation[allocationView]}
                currencyCode={currencyCode}
              />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <MoversList movers={data.movers} currencyCode={currencyCode} />
            <UpcomingList items={data.upcoming} currencyCode={currencyCode} />
          </div>
        </div>

        <CorporateActionSuggestions accountId={scope.accountId} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Largest holdings</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/investments/holdings">See all holdings</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <PositionsTable
              positions={positions.data ?? []}
              currencyCode={currencyCode}
              valueMode={scope.net ? "net" : "market"}
              limit={8}
            />
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">{data.disclaimer}</p>
      </div>
    );
  }

  return (
    <InternalPageLayout
      title="Investments"
      subtitle="Your portfolio at the latest prices, with cached values shown instantly."
      actions={<FreshnessBadge freshness={data?.priceFreshness} />}
    >
      <ScopeBar scope={scope} />
      {content}
    </InternalPageLayout>
  );
}
