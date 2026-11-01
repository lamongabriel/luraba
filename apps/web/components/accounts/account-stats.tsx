"use client";

import type { AccountDetails, AccountInsights } from "@luraba/contracts";

import { AmountDisplay } from "@/components/display";
import { KpiStrip, type KpiStripItem } from "@/components/kpi";
import { formatNumber } from "@/lib/finance";
import { cn } from "@/lib/utils";

function change(current: number, previous: number | undefined): number | null {
  if (previous === undefined || previous === 0) return null;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

/** The hint under a figure: its change against the previous period, colored by whether it is good news. */
function Delta({ value, goodWhenUp }: { value: number | null; goodWhenUp: boolean }) {
  if (value === null) return <>Previous period n/a</>;
  const tone =
    value === 0
      ? "text-muted-foreground"
      : value > 0 === goodWhenUp
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-destructive";
  return (
    <>
      <span className={cn("font-medium", tone)}>
        {value > 0 ? "+" : ""}
        {value}%
      </span>{" "}
      vs previous
    </>
  );
}

/**
 * Supporting numbers for the period under the balance: net change, spending, daily average, the
 * next 30 days of charges and the savings rate (transaction count for a debt). Money in and out are
 * the chips of `AccountOverview`, so they are not repeated here.
 */
export function AccountStats({
  account,
  insights,
  upcomingTotal,
  language,
  precision,
}: {
  account: AccountDetails;
  insights: AccountInsights;
  /** Charges due in the next 30 days. */
  upcomingTotal: number;
  language: string;
  precision: number;
}) {
  const { totals, previous } = insights;
  const isLiability = account.classification === "liability";
  const money = (amount: number, kind: "income" | "expense" | "neutral" | "auto") => (
    <AmountDisplay
      amount={amount}
      currencyCode={account.currencyCode}
      language={language}
      precision={precision}
      kind={kind}
      showSign={kind === "auto"}
    />
  );
  const net = isLiability ? -totals.net : totals.net;
  const items: KpiStripItem[] = [
    {
      label: isLiability ? "Debt reduced" : "Net change",
      value: money(net, "auto"),
      hint: <Delta value={change(totals.net, previous?.net)} goodWhenUp={!isLiability} />,
    },
    {
      label: "Total spent",
      value: money(totals.totalSpent, "neutral"),
      hint: <Delta value={change(totals.totalSpent, previous?.totalSpent)} goodWhenUp={false} />,
    },
    {
      label: "Daily average",
      value: money(totals.averageDailySpend, "neutral"),
      hint: "Spent per day",
    },
    {
      label: "Upcoming",
      value: money(upcomingTotal, "neutral"),
      hint: "Due in 30 days",
    },
    isLiability
      ? {
          label: "Transactions",
          value: formatNumber(totals.transactionCount, language),
          hint: "In the period",
        }
      : {
          label: "Savings rate",
          value:
            totals.savingsRate === null
              ? "—"
              : `${formatNumber(totals.savingsRate, language, { maximumFractionDigits: 0 })}%`,
          hint: totals.savingsRate === null ? "No money in" : "Share of income kept",
        },
  ];

  return <KpiStrip items={items} label="Key figures for the period" />;
}
