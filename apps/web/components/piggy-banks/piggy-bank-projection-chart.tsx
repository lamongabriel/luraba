"use client";

import type { PiggyProjectionPoint } from "@luraba/contracts";

import { AreaChartCard } from "@/components/charts";

/** Balance and deposits month by month (the API's projection, or the plan's with scenario sliders). */
export function PiggyBankProjectionChart({
  title,
  description,
  points,
  currencyCode,
  precision,
  language,
  status = "ready",
  onRetry,
}: {
  title: string;
  description?: string;
  points: PiggyProjectionPoint[];
  currencyCode: string;
  precision: number;
  language: string;
  status?: "ready" | "loading" | "error";
  onRetry?: () => void;
}) {
  return (
    <AreaChartCard
      title={title}
      description={description}
      status={status}
      onRetry={onRetry}
      data={points.map((point) => ({
        date: point.date,
        balance: point.balance,
        deposits: point.deposits,
      }))}
      series={[
        { key: "balance", label: "Balance with interest" },
        { key: "deposits", label: "Deposits only" },
      ]}
      currencyCode={currencyCode}
      precision={precision}
      language={language}
      bucket="month"
      emptyTitle="Nothing to project yet"
    />
  );
}
