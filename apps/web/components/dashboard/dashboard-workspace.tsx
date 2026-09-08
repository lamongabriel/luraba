"use client";

import {
  Calendar03Icon,
  ChartLineData02Icon,
  CreditCardIcon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ErrorState } from "@/components/error-state";
import { MoneyValue } from "@/components/finance/money-value";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiParams } from "@/hooks/use-api-params";
import { getPreferredTransactionDateRange } from "@/lib/transaction-period";
import { useCurrentUserQuery } from "@/queries/auth/use-current-user-query";
import {
  useNetWorthAccountsQuery,
  useNetWorthCashFlowQuery,
  useNetWorthCreditCardsQuery,
  useNetWorthHistoryQuery,
  useNetWorthIncomeQuery,
  useNetWorthRecentActivityQuery,
  useNetWorthSpendingQuery,
  useNetWorthSummaryQuery,
} from "@/queries/networth/use-networth-query";

const chartConfig = {
  netWorth: { label: "Net worth", color: "var(--color-primary)" },
  income: { label: "Income", color: "var(--color-success)" },
  expenses: { label: "Expenses", color: "var(--color-destructive)" },
} as const;

function WidgetSkeleton() {
  return <Skeleton className="h-36 w-full rounded-lg" />;
}

function WidgetError({ onRetry }: { onRetry: () => void }) {
  return (
    <ErrorState
      title="Couldn’t load this panel"
      description="The rest of the dashboard is still available."
      onRetry={onRetry}
    />
  );
}

export function DashboardWorkspace() {
  const session = useCurrentUserQuery();
  const params = useApiParams({
    filters: {
      dateFrom: { type: "string" },
      dateTo: { type: "string" },
      displayCurrencyCode: { type: "string" },
    },
  });
  const [ready, setReady] = React.useState(false);
  const initialized = React.useRef(false);

  React.useEffect(() => {
    if (!session.data || initialized.current) return;
    initialized.current = true;
    const hasExplicitDates = Boolean(params.filters.dateFrom || params.filters.dateTo);
    if (hasExplicitDates) {
      setReady(true);
      return;
    }
    const range = getPreferredTransactionDateRange(
      session.data.user.preferences.preferredPeriod,
      session.data.user.preferences.timezone,
    );
    params.setFilters(range);
    if (session.data.user.preferences.preferredPeriod === "all_time") setReady(true);
  }, [params, session.data]);

  React.useEffect(() => {
    if (initialized.current && params.filters.dateFrom && params.filters.dateTo) {
      setReady(true);
    }
  }, [params.filters.dateFrom, params.filters.dateTo]);

  const query = ready ? params.apiParams : {};
  const summary = useNetWorthSummaryQuery(query, { enabled: ready });
  const history = useNetWorthHistoryQuery(query, { enabled: ready });
  const accounts = useNetWorthAccountsQuery({ ...query, limit: 3 }, { enabled: ready });
  const cashFlow = useNetWorthCashFlowQuery(query, { enabled: ready });
  const spending = useNetWorthSpendingQuery(query, { enabled: ready });
  const income = useNetWorthIncomeQuery(query, { enabled: ready });
  const cards = useNetWorthCreditCardsQuery({ ...query, limit: 3 }, { enabled: ready });
  const activity = useNetWorthRecentActivityQuery({ ...query, limit: 5 }, { enabled: ready });

  if (session.isPending || !ready)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          <WidgetSkeleton />
          <WidgetSkeleton />
          <WidgetSkeleton />
        </div>
      </div>
    );

  const currencyCode =
    summary.data?.displayCurrencyCode ??
    session.data?.household?.settings.defaultCurrencyId ??
    "USD";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your financial picture</h1>
        </div>
        <Button variant="outline" size="sm">
          <HugeiconsIcon icon={Calendar03Icon} />
          {params.filters.dateFrom ?? "All history"}{" "}
          {params.filters.dateTo ? `- ${params.filters.dateTo}` : ""}
        </Button>
      </div>
      <section className="grid gap-3 md:grid-cols-3" aria-label="Net worth summary">
        {summary.isPending ? (
          <>
            <WidgetSkeleton />
            <WidgetSkeleton />
            <WidgetSkeleton />
          </>
        ) : summary.isError ? (
          <div className="md:col-span-3">
            <WidgetError onRetry={() => void summary.refetch()} />
          </div>
        ) : summary.data ? (
          <>
            <Card>
              <CardHeader>
                <CardDescription>Net worth</CardDescription>
                <CardTitle className="text-2xl">
                  <MoneyValue amount={summary.data.netWorth.amount} currencyCode={currencyCode} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Assets less liabilities</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Income</CardDescription>
                <CardTitle className="text-emerald-600">
                  <MoneyValue amount={summary.data.income.amount} currencyCode={currencyCode} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Expenses</CardDescription>
                <CardTitle>
                  <MoneyValue amount={summary.data.expenses.amount} currencyCode={currencyCode} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Transfers excluded</p>
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={ChartLineData02Icon} />
              Net worth history
            </CardTitle>
            <CardDescription>Ledger balance over the selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {history.isPending ? (
              <WidgetSkeleton />
            ) : history.isError ? (
              <WidgetError onRetry={() => void history.refetch()} />
            ) : (
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <AreaChart data={history.data?.points ?? []}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="var(--color-netWorth)"
                    fill="var(--color-netWorth)"
                    fillOpacity={0.12}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>Largest balances by side</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.isPending ? (
              <WidgetSkeleton />
            ) : accounts.isError ? (
              <WidgetError onRetry={() => void accounts.refetch()} />
            ) : (
              <>
                <AccountList
                  title="Assets"
                  rows={accounts.data?.assets ?? []}
                  currencyCode={currencyCode}
                />
                <AccountList
                  title="Liabilities"
                  rows={accounts.data?.liabilities ?? []}
                  currencyCode={currencyCode}
                />
              </>
            )}
          </CardContent>
        </Card>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash flow</CardTitle>
            <CardDescription>Income and expenses by period</CardDescription>
          </CardHeader>
          <CardContent>
            {cashFlow.isPending ? (
              <WidgetSkeleton />
            ) : cashFlow.isError ? (
              <WidgetError onRetry={() => void cashFlow.refetch()} />
            ) : (
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <BarChart data={cashFlow.data?.points ?? []}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={2} />
                  <Bar dataKey="expenses" fill="var(--color-expenses)" radius={2} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <BreakdownCard title="Where money goes" query={spending} currencyCode={currencyCode} />
        <BreakdownCard title="Where money comes from" query={income} currencyCode={currencyCode} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HugeiconsIcon icon={CreditCardIcon} />
              Credit cards
            </CardTitle>
            <CardDescription>Remaining available credit</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {cards.isPending ? (
              <WidgetSkeleton />
            ) : cards.isError ? (
              <WidgetError onRetry={() => void cards.refetch()} />
            ) : (
              cards.data?.cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{card.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {card.brand} ·•••• {card.last4}
                    </p>
                  </div>
                  <div className="text-right">
                    <MoneyValue
                      amount={card.remainingAmount}
                      currencyCode={currencyCode}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {card.utilizationPercentage}% used
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest posted transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.isPending ? (
              <WidgetSkeleton />
            ) : activity.isError ? (
              <WidgetError onRetry={() => void activity.refetch()} />
            ) : (
              activity.data?.rows.map((row) => (
                <div
                  key={String(row.id)}
                  className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {String(row.description ?? "Transaction")}
                    </p>
                    <p className="text-xs text-muted-foreground">{String(row.postedDate ?? "")}</p>
                  </div>
                  <span className="text-sm tabular-nums">{String(row.amount ?? "")}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function AccountList({
  title,
  rows,
  currencyCode,
}: {
  title: string;
  rows: Array<{ id: string; name: string; balance: number }>;
  currencyCode: string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <HugeiconsIcon
                icon={Wallet01Icon}
                className="size-4 shrink-0 text-muted-foreground"
              />
              {row.name}
            </span>
            <MoneyValue amount={row.balance} currencyCode={currencyCode} className="text-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  query,
  currencyCode,
}: {
  title: string;
  query: ReturnType<typeof useNetWorthSpendingQuery>;
  currencyCode: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Top categories and sources</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {query.isPending ? (
          <WidgetSkeleton />
        ) : query.isError ? (
          <WidgetError onRetry={() => void query.refetch()} />
        ) : (
          query.data?.items.map((item) => (
            <div key={`${item.id ?? "other"}-${item.name}`} className="space-y-1">
              <div className="flex justify-between gap-2 text-sm">
                <span>{item.name}</span>
                <MoneyValue amount={item.amount} currencyCode={currencyCode} className="text-sm" />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(item.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
