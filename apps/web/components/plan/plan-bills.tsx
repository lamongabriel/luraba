"use client";

import type { SafeToSpend, SafeToSpendBill } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";

import { AmountDisplay } from "@/components/display";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { PLAN_BILL_ROW } from "./plan-layout";

type BillRow = SafeToSpendBill & { currencyCode: string };

/** The unpaid fixed bills that feed the maths: overdue and this month first, then next month. */
export function billRows(plan: SafeToSpend): BillRow[] {
  return plan.currencies
    .flatMap((group) => group.bills.map((bill) => ({ ...bill, currencyCode: group.currencyCode })))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function BillList({
  title,
  rows,
  precisionOf,
  language,
}: {
  title: string;
  rows: BillRow[];
  precisionOf: (currencyCode: string) => number;
  language: string;
}) {
  return (
    <div className="space-y-2">
      <Typography variant="small-muted">{title}</Typography>
      {rows.length === 0 ? (
        <Typography variant="small-muted" className="border-y border-border/60 py-4">
          Nothing left to pay.
        </Typography>
      ) : (
        <ul className="divide-y divide-border/60 border-y border-border/60">
          {rows.map((bill) => (
            <li
              key={bill.occurrenceId}
              className={cn("flex items-center justify-between gap-3", PLAN_BILL_ROW)}
            >
              <div className="min-w-0">
                <Link
                  href={`/bills/${bill.billId}`}
                  className="block truncate text-sm font-medium hover:underline"
                >
                  {bill.name}
                </Link>
                <span className="text-xs text-muted-foreground">
                  Due {formatShortDate(bill.dueDate, language)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {bill.overdue ? <Badge variant="destructive">Overdue</Badge> : null}
                <AmountDisplay
                  amount={bill.amount}
                  currencyCode={bill.currencyCode}
                  kind="expense"
                  showSign={false}
                  precision={precisionOf(bill.currencyCode)}
                  language={language}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlanBills({
  plan,
  precisionOf,
  language,
}: {
  plan: SafeToSpend;
  precisionOf: (currencyCode: string) => number;
  language: string;
}) {
  const rows = billRows(plan);
  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
      <BillList
        title="Left to pay this month"
        rows={rows.filter((bill) => bill.horizon === "this_month")}
        precisionOf={precisionOf}
        language={language}
      />
      <BillList
        title="Due next month"
        rows={rows.filter((bill) => bill.horizon === "next_month")}
        precisionOf={precisionOf}
        language={language}
      />
    </div>
  );
}

/** Loading twin of `PlanBills`: two lists with three rows each. */
export function PlanBillsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading bills"
      className="grid gap-x-10 gap-y-6 lg:grid-cols-2"
    >
      {[0, 1].map((column) => (
        <div key={column} className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <div className="divide-y divide-border/60 border-y border-border/60">
            {[0, 1, 2].map((row) => (
              <div
                key={row}
                className={cn("flex items-center justify-between gap-3", PLAN_BILL_ROW)}
              >
                <div className="space-y-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
