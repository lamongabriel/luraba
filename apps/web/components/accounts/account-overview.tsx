"use client";

import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AccountDetails, AccountInsights } from "@luraba/contracts";
import type { ChartStatus } from "@/components/charts";
import { AreaChartCard } from "@/components/charts";
import { AmountDisplay } from "@/components/display";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { accountBalanceKind } from "@/lib/accounts";
import { cn } from "@/lib/utils";

import { ACCOUNT_BALANCE_CHART_HEIGHT } from "./account-detail-layout";

const CHIP_BASE =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium [&_svg]:size-3.5";

function FlowChip({
  direction,
  tone,
  label,
  children,
}: {
  direction: "up" | "down";
  tone: "positive" | "negative";
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={label}
      className={cn(
        CHIP_BASE,
        tone === "positive"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-destructive/10 text-destructive",
      )}
    >
      <HugeiconsIcon icon={direction === "up" ? ArrowUp01Icon : ArrowDown01Icon} strokeWidth={2} />
      <span className="sr-only">{label}: </span>
      {children}
    </span>
  );
}

/**
 * The top of the page: the balance as the biggest thing on it, what came in and went out in the
 * period as two chips, and the balance history as a flat chart under it. Sits on the page, not in a
 * card.
 */
export function AccountOverview({
  account,
  insights,
  status,
  errorMessage,
  onRetry,
  language,
  precision,
}: {
  account: AccountDetails;
  insights: AccountInsights | undefined;
  status: ChartStatus;
  errorMessage?: string;
  onRetry: () => void;
  language: string;
  precision: number;
}) {
  const isLiability = account.classification === "liability";
  const label = isLiability
    ? account.balance < 0
      ? "Overpayment"
      : "Amount owed"
    : "Current balance";
  const money = (amount: number, kind: "income" | "expense") => (
    <AmountDisplay
      amount={amount}
      currencyCode={account.currencyCode}
      language={language}
      precision={precision}
      kind={kind}
      showSign={false}
    />
  );

  return (
    <section aria-label="Balance" className="space-y-4">
      <div className="space-y-2">
        <Typography variant="small-muted">{label}</Typography>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <AmountDisplay
            amount={account.balance}
            currencyCode={account.currencyCode}
            language={language}
            precision={precision}
            kind={accountBalanceKind(account.classification, account.balance)}
            showSign={false}
            className="text-4xl font-semibold tracking-tight"
          />
          {insights ? (
            <div className="flex flex-wrap items-center gap-2">
              <FlowChip
                direction="up"
                tone={isLiability ? "negative" : "positive"}
                label={isLiability ? "Debt added" : "Money in"}
              >
                {money(insights.totals.moneyIn, isLiability ? "expense" : "income")}
              </FlowChip>
              <FlowChip
                direction="down"
                tone={isLiability ? "positive" : "negative"}
                label={isLiability ? "Paid down" : "Money out"}
              >
                {money(insights.totals.moneyOut, isLiability ? "income" : "expense")}
              </FlowChip>
            </div>
          ) : status === "loading" ? (
            <OverviewChipsSkeleton />
          ) : null}
        </div>
      </div>
      <AreaChartCard
        flat
        title="Balance history"
        status={status}
        errorMessage={errorMessage}
        onRetry={onRetry}
        heightClassName={ACCOUNT_BALANCE_CHART_HEIGHT}
        data={insights?.balanceHistory ?? []}
        series={[{ key: "balance", label: "Balance" }]}
        currencyCode={account.currencyCode}
        precision={precision}
        language={language}
        bucket={insights?.bucket}
        emptyTitle="No balance history"
        emptyDescription="This account has no activity in the selected period."
      />
    </section>
  );
}

function OverviewChipsSkeleton() {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-6 w-24" />
    </div>
  );
}

/** Loading twin of `AccountOverview`: same label, balance row, chips and chart height. */
export function AccountOverviewSkeleton() {
  return (
    <section aria-hidden="true" className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-28" />
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <Skeleton className="h-10 w-56" />
          <OverviewChipsSkeleton />
        </div>
      </div>
      <div className={ACCOUNT_BALANCE_CHART_HEIGHT}>
        <Skeleton className="h-full w-full" />
      </div>
    </section>
  );
}
