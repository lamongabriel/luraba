"use client";

import { AMOUNT_KIND_DISPLAY } from "@/components/display";
import { cn } from "@/lib/utils";

import { signOf } from "./format";
import { useInvestmentFormat } from "./use-investment-format";

const KIND = {
  positive: AMOUNT_KIND_DISPLAY.income,
  negative: AMOUNT_KIND_DISPLAY.expense,
  zero: AMOUNT_KIND_DISPLAY.neutral,
} as const;

/** A signed percentage (`+1.25%`) colored like gains and losses everywhere else in the app. */
export function PercentChange({
  value,
  className,
}: {
  value: string | number | null | undefined;
  className?: string;
}) {
  const format = useInvestmentFormat();
  if (value === null || value === undefined || value === "") {
    return <span className={cn("text-muted-foreground", className)}>—</span>;
  }
  return (
    <span
      className={cn("whitespace-nowrap tabular-nums", KIND[signOf(value)].className, className)}
    >
      {format.signedPercent(value)}
    </span>
  );
}
