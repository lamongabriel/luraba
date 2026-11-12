"use client";

import type { SafeToSpendCurrency } from "@luraba/contracts";
import * as React from "react";

import { AmountDisplay } from "@/components/display";
import { SegmentedControl } from "@/components/investments/segmented-control";
import { MoneyInput } from "@/components/ui/masked-input";
import { Typography } from "@/components/ui/typography";
import { majorToMinorUnits } from "@/lib/finance";
import { applyPurchase, type PurchaseMode } from "@/lib/plan";
import { cn } from "@/lib/utils";
import { PLAN_WHAT_IF_HEIGHT } from "./plan-layout";

const MODES = [
  { value: "cash", label: "Cash now" },
  { value: "card", label: "Credit card" },
] as const;

/** "What if I spend...": type an amount and see what it does to this month (cash) or next month (card). */
export function WhatIf({
  group,
  precision,
  language,
}: {
  group: SafeToSpendCurrency;
  precision: number;
  language: string;
}) {
  const [value, setValue] = React.useState("");
  const [mode, setMode] = React.useState<PurchaseMode>("card");
  const amount = value === "" ? 0 : majorToMinorUnits(Number(value), precision);
  const result = amount > 0 ? applyPurchase(group, amount, mode) : null;
  const horizon = mode === "cash" ? "this month" : "next month";

  return (
    <div className={cn("space-y-2", PLAN_WHAT_IF_HEIGHT)}>
      <div className="flex flex-wrap items-center gap-3">
        <Typography variant="small-strong">What if I spend</Typography>
        <MoneyInput
          aria-label={`Purchase amount in ${group.currencyCode}`}
          className="w-36"
          value={value}
          onValueChange={setValue}
          precision={precision}
          language={language}
        />
        <SegmentedControl
          label="How you would pay"
          value={mode}
          onChange={setMode}
          options={MODES}
        />
      </div>
      <div aria-live="polite" className="min-h-5 text-sm">
        {result === null ? (
          <Typography variant="small-muted">
            A card purchase is billed next month; cash comes out of this month.
          </Typography>
        ) : result.remaining === null ? (
          <Typography variant="small-muted">
            No monthly plan in {group.currencyCode}, so there is no income to compare next month's
            card spending with.
          </Typography>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Left {horizon} after this:</span>
            <AmountDisplay
              amount={Math.abs(result.remaining)}
              currencyCode={group.currencyCode}
              kind={result.remaining < 0 ? "expense" : "neutral"}
              precision={precision}
              language={language}
              className="font-semibold"
            />
            {result.compromises ? (
              <span className="text-destructive">
                {mode === "cash" ? "More than you have left." : "This would compromise next month."}
              </span>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}
