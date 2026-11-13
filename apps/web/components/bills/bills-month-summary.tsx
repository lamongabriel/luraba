"use client";

import type { BillForecast } from "@luraba/contracts";
import * as React from "react";

import { CombinedAmountDisplay } from "@/components/display";
import { useCombinedAmount } from "@/hooks/use-combined-amount";
import { cn } from "@/lib/utils";
import { BILLS_SUMMARY_HEIGHT } from "./bill-layout";

type Item = BillForecast["items"][number];

/**
 * The month at a glance, one thin bar instead of tiles: paid, upcoming and overdue payments as segments (by
 * count), "3 of 8 paid" and what is still to pay in the base currency.
 */
export function BillsMonthSummary({ items, language }: { items: Item[]; language: string }) {
  const counted = items.filter((item) => item.state !== "skipped");
  const paid = counted.filter((item) => item.state === "paid").length;
  const overdue = counted.filter((item) => item.state === "overdue").length;
  const upcoming = counted.length - paid - overdue;
  const unpaidByCurrency = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const item of counted) {
      if (item.state === "paid") continue;
      totals[item.currencyCode] = (totals[item.currencyCode] ?? 0) + item.expectedAmount;
    }
    return totals;
  }, [counted]);
  const { combined, fx } = useCombinedAmount(unpaidByCurrency);
  const total = counted.length;
  const share = (count: number) => (total === 0 ? 0 : (count / total) * 100);

  return (
    <div className={cn("flex flex-col justify-center gap-2", BILLS_SUMMARY_HEIGHT)}>
      <div
        role="img"
        aria-label={`${paid} of ${total} payments paid, ${overdue} overdue`}
        className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
      >
        <span className="bg-emerald-500" style={{ width: `${share(paid)}%` }} />
        <span className="bg-destructive" style={{ width: `${share(overdue)}%` }} />
        <span className="bg-muted-foreground/30" style={{ width: `${share(upcoming)}%` }} />
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {paid} of {total} paid{overdue > 0 ? ` · ${overdue} overdue` : ""}
        </span>
        {total - paid > 0 ? (
          <span className="flex items-center gap-1">
            <CombinedAmountDisplay combined={combined} fx={fx} language={language} size="sm" /> left
          </span>
        ) : (
          <span>All paid</span>
        )}
      </div>
    </div>
  );
}
