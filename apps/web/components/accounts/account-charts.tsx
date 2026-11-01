"use client";

import { ChartBarLineIcon, PieChartIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AccountInsights } from "@luraba/contracts";
import type { ChartStatus } from "@/components/charts";
import { BarChartCard, CHART_SEMANTIC, DonutChartCard } from "@/components/charts";

type ChartSectionProps = {
  insights: AccountInsights | undefined;
  status: ChartStatus;
  errorMessage?: string;
  onRetry: () => void;
  currencyCode: string;
  language: string;
  precision: number;
};

const ICON_PROPS = { strokeWidth: 2 } as const;

/** Money in against money out for each bucket of the period. */
export function AccountCashFlowChart({
  insights,
  status,
  errorMessage,
  onRetry,
  currencyCode,
  language,
  precision,
}: ChartSectionProps) {
  const isLiability = insights?.classification === "liability";
  const hasFlow = insights?.cashFlow.some((point) => point.moneyIn > 0 || point.moneyOut > 0);

  return (
    <BarChartCard
      title="Cash flow"
      description={`${isLiability ? "Debt added" : "Money in"} against ${isLiability ? "paid down" : "money out"}`}
      icon={<HugeiconsIcon icon={ChartBarLineIcon} {...ICON_PROPS} />}
      status={status}
      errorMessage={errorMessage}
      onRetry={onRetry}
      data={hasFlow ? (insights?.cashFlow ?? []) : []}
      series={[
        {
          key: "moneyIn",
          label: isLiability ? "Debt added" : "Money in",
          color: isLiability ? CHART_SEMANTIC.negative : CHART_SEMANTIC.positive,
        },
        {
          key: "moneyOut",
          label: isLiability ? "Paid down" : "Money out",
          color: isLiability ? CHART_SEMANTIC.positive : CHART_SEMANTIC.negative,
        },
      ]}
      currencyCode={currencyCode}
      precision={precision}
      language={language}
      bucket={insights?.bucket}
      emptyTitle="No cash flow"
      emptyDescription="No money moved through this account in the selected period."
    />
  );
}

/** Where the money went: expenses paid from the account, by category. */
export function AccountExpenseBreakdownChart({
  insights,
  status,
  errorMessage,
  onRetry,
  currencyCode,
  language,
  precision,
}: ChartSectionProps) {
  return (
    <DonutChartCard
      title="Expenses by category"
      description="Spending paid from this account"
      icon={<HugeiconsIcon icon={PieChartIcon} {...ICON_PROPS} />}
      status={status}
      errorMessage={errorMessage}
      onRetry={onRetry}
      data={(insights?.categories ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        value: item.amount,
        color: item.color,
      }))}
      currencyCode={currencyCode}
      precision={precision}
      language={language}
      centerLabel="Spent"
      emptyTitle="No expenses"
      emptyDescription="Nothing was spent from this account in the selected period."
    />
  );
}
