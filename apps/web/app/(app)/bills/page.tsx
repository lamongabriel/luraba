"use client";

import type { Bill } from "@luraba/contracts";
import { MAX_PER_PAGE } from "@luraba/contracts";
import { addDays, formatISODate, formatShortDate } from "@luraba/domain";
import Link from "next/link";
import * as React from "react";
import { BillSheet } from "@/components/bills/bill-sheet";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MoneyValue } from "@/components/finance/money-value";
import { ItemReveal, SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useEntityDisclosure } from "@/hooks/use-disclosure";
import { describeBillSchedule } from "@/lib/bills";
import { useBillForecastQuery, useBillsQuery } from "@/queries/bills/use-bills-queries";
import { useAuthSessionStore } from "@/stores/auth-session-store";

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
    const today = new Date();
    return {
      from: formatISODate(today),
      to: formatISODate(addDays(today, FORECAST_DAYS)),
    };
  }, []);
  const forecast = useBillForecastQuery(range);

  if (forecast.isPending || forecast.isError) return null;

  const upcoming = forecast.data.items.filter((item) => item.state !== "paid");
  const totals = new Map<string, number>();
  for (const item of upcoming) {
    totals.set(item.currencyCode, (totals.get(item.currencyCode) ?? 0) + item.expectedAmount);
  }
  const overdue = upcoming.filter((item) => item.state === "overdue").length;

  return (
    <ItemReveal className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-border/60 p-4">
        <Typography variant="small-muted">Due in the next {FORECAST_DAYS} days</Typography>
        <div className="mt-1 space-y-0.5">
          {totals.size === 0 ? (
            <Typography variant="small-strong">Nothing due</Typography>
          ) : (
            [...totals].map(([currencyCode, amount]) => (
              <MoneyValue
                key={currencyCode}
                amount={amount}
                currencyCode={currencyCode}
                language={language}
                className="block text-lg"
              />
            ))
          )}
        </div>
      </div>
      <div className="rounded-xl border border-border/60 p-4">
        <Typography variant="small-muted">Payments coming up</Typography>
        <Typography variant="small-strong" className="mt-1 text-lg">
          {upcoming.length}
        </Typography>
      </div>
      <div className="rounded-xl border border-border/60 p-4">
        <Typography variant="small-muted">Overdue</Typography>
        <Typography variant="small-strong" className="mt-1 text-lg">
          {overdue}
        </Typography>
      </div>
    </ItemReveal>
  );
}

export default function BillsPage() {
  const sheet = useEntityDisclosure<Bill>();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const query = useBillsQuery({ perPage: MAX_PER_PAGE });
  const bills = query.data?.data ?? [];

  let content: React.ReactNode;

  if (query.isPending) {
    content = (
      <div className="grid gap-3 md:grid-cols-2">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton key={key} className="h-28 rounded-xl bg-muted/50" />
        ))}
      </div>
    );
  } else if (query.isError) {
    content = (
      <ErrorState
        title="Couldn't load bills"
        description={query.error.message || "An unexpected error occurred while loading this page."}
        onRetry={() => void query.refetch()}
      />
    );
  } else if (bills.length === 0) {
    content = (
      <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
        <Typography variant="small-strong">No bills yet</Typography>
        <Typography variant="small-muted" className="mt-1">
          Add a recurring payment like water, rent or a loan and Luraba will remind you.
        </Typography>
      </div>
    );
  } else {
    content = (
      <SectionReveal className="grid gap-3 md:grid-cols-2">
        {bills.map((bill) => (
          <BillCard key={bill.id} bill={bill} language={language} />
        ))}
      </SectionReveal>
    );
  }

  return (
    <InternalPageLayout
      title="Bills"
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
