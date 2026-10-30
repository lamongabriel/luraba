"use client";

import type { Bill } from "@luraba/contracts";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { addDays, formatISODate, formatShortDate, now } from "@luraba/domain";
import Link from "next/link";
import * as React from "react";
import { BillSheet } from "@/components/bills/bill-sheet";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MoneyValue } from "@/components/finance/money-value";
import { KpiCard, KpiGrid, KpiGridSkeleton } from "@/components/kpi";
import { ItemReveal, SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { DataBoundary } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Typography } from "@/components/ui/typography";
import { useEntityDisclosure } from "@/hooks/use-disclosure";
import { describeBillSchedule } from "@/lib/bills";
import { useBillForecastQuery, useBillsQuery } from "@/queries/bills/use-bills-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { BillsEmpty } from "./_empty";
import { BillsError } from "./_error";
import { BillsLoading } from "./_loading";

const FORECAST_DAYS = 30;

function BillCard({ bill, language }: { bill: Bill; language: string }) {
  const { summary } = bill;
  const total = bill.installmentCount;
  const progress = total ? Math.min(100, Math.round((summary.paidCount / total) * 100)) : null;

  return (
    <Link
      href={`/bills/${bill.id}`}
      className="block rounded-xl border border-border/60 p-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Typography variant="small-strong" className="truncate">
            {bill.name}
          </Typography>
          <Typography variant="small-muted">{describeBillSchedule(bill)}</Typography>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {summary.overdueCount > 0 ? (
            <Badge variant="destructive">{summary.overdueCount} overdue</Badge>
          ) : null}
          {bill.status !== "active" ? (
            <Badge variant="outline" className="capitalize">
              {bill.status}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <Typography variant="small-muted">
            {summary.nextDueDate
              ? `Next: ${formatShortDate(summary.nextDueDate, language)}`
              : "No upcoming payments"}
          </Typography>
        </div>
        <MoneyValue
          amount={summary.nextExpectedAmount ?? bill.expectedAmount}
          currencyCode={bill.currencyCode}
          language={language}
          className="text-sm"
        />
      </div>

      {progress !== null && total ? (
        <div className="mt-3 space-y-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <Typography variant="small-muted">
            {summary.paidCount} of {total} paid
            {summary.remainingCount !== null ? ` · ${summary.remainingCount} left` : ""}
          </Typography>
        </div>
      ) : null}
    </Link>
  );
}

function ForecastStrip({ language }: { language: string }) {
  const range = React.useMemo(() => {
    const today = now();
    return {
      from: formatISODate(today),
      to: formatISODate(addDays(today, FORECAST_DAYS)),
    };
  }, []);
  const forecast = useBillForecastQuery(range);

  if (forecast.isPending) return <KpiGridSkeleton columns={3} label="Loading forecast" />;
  if (forecast.isError) return null;

  const upcoming = forecast.data.items.filter((item) => item.state !== "paid");
  const totals = new Map<string, number>();
  for (const item of upcoming) {
    totals.set(item.currencyCode, (totals.get(item.currencyCode) ?? 0) + item.expectedAmount);
  }
  const overdue = upcoming.filter((item) => item.state === "overdue").length;

  return (
    <ItemReveal>
      <KpiGrid columns={3}>
        <KpiCard title={`Due in the next ${FORECAST_DAYS} days`}>
          {totals.size === 0
            ? "Nothing due"
            : [...totals].map(([currencyCode, amount]) => (
                <MoneyValue
                  key={currencyCode}
                  amount={amount}
                  currencyCode={currencyCode}
                  language={language}
                  className="block"
                />
              ))}
        </KpiCard>
        <KpiCard title="Payments coming up" value={upcoming.length} />
        <KpiCard title="Overdue" value={overdue} />
      </KpiGrid>
    </ItemReveal>
  );
}

export default function BillsPage() {
  const sheet = useEntityDisclosure<Bill>();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const query = useBillsQuery({ perPage: MAX_PER_PAGE });
  const bills = query.data?.data ?? [];

  const content = (
    <DataBoundary
      isPending={query.isPending}
      isError={query.isError}
      isEmpty={bills.length === 0}
      loading={<BillsLoading />}
      errorState={
        <BillsError message={query.error?.message} onRetry={() => void query.refetch()} />
      }
      empty={<BillsEmpty onCreate={sheet.onCreate} />}
    >
      <SectionReveal className="grid gap-3 md:grid-cols-2">
        {bills.map((bill) => (
          <BillCard key={bill.id} bill={bill} language={language} />
        ))}
      </SectionReveal>
    </DataBoundary>
  );

  return (
    <InternalPageLayout
      title="Bills"
      subtitle="Recurring bills and when each one is due."
      actions={
        <PermissionButton
          permission={PERMISSIONS.BILLS_CREATE}
          deniedMessage="Your household role cannot create bills."
          onClick={sheet.onCreate}
        >
          Add bill
        </PermissionButton>
      }
    >
      <ForecastStrip language={language} />
      {content}
      <BillSheet open={sheet.isOpen} onOpenChange={sheet.setIsOpen} bill={sheet.entity} />
    </InternalPageLayout>
  );
}
