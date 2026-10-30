"use client";

import { formatShortDate, todayISODate } from "@luraba/domain";
import { keepPreviousData } from "@tanstack/react-query";
import * as React from "react";

import { VerticalBarChart } from "@/components/charts";
import { AmountDisplay, AssetDisplay, InvestmentEventTypeDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MetricCard } from "@/components/investments/metric-card";
import { ScopeBar } from "@/components/investments/scope-bar";
import { SegmentedControl } from "@/components/investments/segmented-control";
import { useInvestmentFormat } from "@/components/investments/use-investment-format";
import { scopeQuery, useInvestmentScope } from "@/components/investments/use-investment-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/finance";
import { useInvestmentIncomeQuery } from "@/queries/investments/use-investments-queries";

type Range = "12M" | "YTD" | "ALL";
const RANGES = [
  { value: "12M", label: "12 months" },
  { value: "YTD", label: "This year" },
  { value: "ALL", label: "All time" },
] as const;

function rangeToDates(range: Range): { from?: string; to?: string } {
  const today = todayISODate();
  if (range === "ALL") return {};
  if (range === "YTD") return { from: `${today.slice(0, 4)}-01-01`, to: today };
  const year = Number(today.slice(0, 4)) - 1;
  return { from: `${year}${today.slice(4)}`, to: today };
}

export default function IncomePage() {
  const format = useInvestmentFormat();
  const scope = useInvestmentScope();
  const [range, setRange] = React.useState<Range>("12M");
  const income = useInvestmentIncomeQuery(
    { ...scopeQuery(scope), ...rangeToDates(range) },
    { placeholderData: keepPreviousData },
  );

  let content: React.ReactNode;
  if (income.isPending) {
    content = <Skeleton className="h-72 rounded-xl bg-muted/50" />;
  } else if (income.isError) {
    content = (
      <ErrorState
        title="Couldn't load your income"
        description={income.error.message}
        onRetry={() => void income.refetch()}
      />
    );
  } else if (income.data.rows.length === 0) {
    content = (
      <EmptyState
        title="No income in this period"
        description="Dividends, interest on equity, coupons and fund income show up here."
      />
    );
  } else {
    const data = income.data;
    const currencyCode = data.reportingCurrencyCode;
    const precision = format.precisionOf(currencyCode);
    const money = (amount: number) => (
      <AmountDisplay
        amount={amount}
        currencyCode={currencyCode}
        precision={precision}
        language={format.language}
        size="md"
      />
    );
    content = (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard label="Gross income" value={money(data.totalGross)} />
          <MetricCard label="Taxes withheld" value={money(data.totalWithheld)} />
          <MetricCard label="Net income" value={money(data.totalNet)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>By month</CardTitle>
          </CardHeader>
          <CardContent>
            <VerticalBarChart
              title="Income by month"
              data={data.byMonth.map((row) => ({ month: row.month, net: row.net }))}
              categoryKey="month"
              valueKey="net"
              valueLabel="Net income"
              formatValue={(value) =>
                formatCurrency(value, currencyCode, format.language, undefined, precision)
              }
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>By asset</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {data.byAsset.map((row) => (
                  <li
                    key={row.assetId ?? row.symbol}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <AssetDisplay
                      asset={{ symbol: row.symbol, name: "" }}
                      size="xs"
                      detail="none"
                    />
                    {money(row.net)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>By type</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {data.byType.map((row) => (
                  <li key={row.type} className="flex items-center justify-between gap-3 py-2">
                    <InvestmentEventTypeDisplay type={row.type} variant="inline" />
                    {money(row.net)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 overflow-x-auto rounded-md border">
          <Table className="min-w-[40rem]">
            <TableHeader>
              <TableRow data-hover-disabled="true">
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Withheld</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.eventId}>
                  <TableCell className="whitespace-nowrap">
                    {formatShortDate(row.date, format.language)}
                  </TableCell>
                  <TableCell>
                    {row.symbol ? (
                      <AssetDisplay
                        asset={{ symbol: row.symbol, name: "" }}
                        size="xs"
                        detail="none"
                      />
                    ) : (
                      "Cash"
                    )}
                  </TableCell>
                  <TableCell>
                    <InvestmentEventTypeDisplay type={row.type} variant="inline" size="xs" />
                  </TableCell>
                  <TableCell className="text-right">{money(row.gross)}</TableCell>
                  <TableCell className="text-right">{money(row.withheld)}</TableCell>
                  <TableCell className="text-right">{money(row.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <InternalPageLayout
      title="Income"
      subtitle="Dividends, interest on equity, coupons and fund income, before and after withholding."
      actions={
        <SegmentedControl label="Period" value={range} onChange={setRange} options={RANGES} />
      }
    >
      <ScopeBar scope={scope} showNet={false} />
      {content}
    </InternalPageLayout>
  );
}
