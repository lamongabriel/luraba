"use client";

import type { InvestmentDashboard } from "@luraba/contracts";

import { PriorityDonutChart } from "@/components/charts";
import { formatCurrency } from "@/lib/finance";

import { useInvestmentFormat } from "./use-investment-format";

type Slice = InvestmentDashboard["allocation"]["class"][number];

/** Allocation donut over slices from the dashboard or the allocation report. */
export function AllocationChart({
  title,
  slices,
  currencyCode,
  status = "ready",
}: {
  title: string;
  slices: Slice[];
  currencyCode: string;
  status?: "ready" | "loading" | "error";
}) {
  const format = useInvestmentFormat();
  const precision = format.precisionOf(currencyCode);
  return (
    <PriorityDonutChart
      title={title}
      status={status}
      valueLabel="Value"
      data={slices
        .filter((slice) => slice.value > 0)
        .map((slice) => ({ name: slice.label, value: slice.value }))}
      formatValue={(value) =>
        formatCurrency(value, currencyCode, format.language, undefined, precision)
      }
    />
  );
}
