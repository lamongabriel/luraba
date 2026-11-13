"use client";

import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { UpcomingTransaction } from "@luraba/contracts";
import { differenceInCalendarDays, getTodayInTimezone, parseISODate } from "@luraba/domain";
import { AmountDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/** Rows the section asks for; its loading twin shows the same number. */
export const UPCOMING_ROWS = 5;
/** Height of one row, shared with the skeleton. */
const ROW_HEIGHT = "h-14";

function dueLabel(days: number, overdue: boolean) {
  if (overdue || days < 0) {
    const late = Math.abs(days);
    return late <= 1 ? "Overdue" : `Overdue by ${late} days`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

function DateTile({ iso, overdue, language }: { iso: string; overdue: boolean; language: string }) {
  const date = parseISODate(iso);
  const month = new Intl.DateTimeFormat(language, { month: "short", timeZone: "UTC" }).format(date);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 flex-col items-center justify-center rounded-lg leading-none",
        overdue ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground",
      )}
    >
      <span className="text-sm font-semibold tabular-nums">{date.getUTCDate()}</span>
      <span className="text-[0.55rem] font-medium uppercase tracking-wide opacity-70">{month}</span>
    </span>
  );
}

/**
 * What is coming up: bills and card installments due next, below the transactions table. A section on the page
 * background (title, then hairline-separated rows), not a card: a date tile, what it is and where it is charged, the
 * amount and how soon it is due. A bill opens its page; an installment opens its purchase.
 */
export function UpcomingTransactionsPanel({
  rows,
  language = "en",
  precision = 2,
  onSelect,
}: {
  rows: UpcomingTransaction[];
  language?: string;
  precision?: number;
  onSelect?: (row: UpcomingTransaction) => void;
}) {
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const today = getTodayInTimezone(timezone);

  return (
    <section aria-label="Upcoming transactions" className="min-w-0">
      <header className="flex items-end justify-between gap-3 pb-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Upcoming</h2>
          <p className="text-xs text-muted-foreground">Bills and installments due next</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <EmptyState
          variant="embedded"
          icon={<HugeiconsIcon icon={Calendar03Icon} strokeWidth={1.8} className="size-5" />}
          title="Nothing coming up"
          description="Card installments and bills due soon appear here."
        />
      ) : (
        <ul className="divide-y divide-border/60 border-y border-border/60">
          {rows.map((row) => {
            const days = differenceInCalendarDays(parseISODate(row.effectiveDate), today);
            const overdue = row.isOverdue || days < 0;
            const isBill = row.sourceType === "bill_occurrence";
            const where = row.creditCardName ?? row.accountName;
            return (
              <li key={`${row.sourceType}-${row.sourceId}-${row.effectiveDate}`}>
                <button
                  type="button"
                  onClick={() => onSelect?.(row)}
                  className={cn(
                    "-mx-2 flex w-[calc(100%+1rem)] items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none",
                    ROW_HEIGHT,
                  )}
                >
                  <DateTile iso={row.effectiveDate} overdue={overdue} language={language} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-medium">
                      {row.description}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {isBill
                        ? "Bill"
                        : row.installmentNumber && row.installmentCount
                          ? `Installment ${row.installmentNumber}/${row.installmentCount}`
                          : "Installment"}
                      {where ? ` · ${where}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <AmountDisplay
                      amount={row.amount}
                      currencyCode={row.currencyCode}
                      kind="expense"
                      size="sm"
                      language={language}
                      precision={precision}
                      className="font-semibold"
                    />
                    <span
                      className={cn(
                        "mt-0.5 block text-xs",
                        overdue ? "font-medium text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {dueLabel(days, row.isOverdue)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Loading twin of `UpcomingTransactionsPanel`: the same heading and the same number of rows. */
export function UpcomingTransactionsSkeleton() {
  return (
    <section
      role="status"
      aria-busy="true"
      aria-label="Loading upcoming transactions"
      className="min-w-0"
    >
      <header className="pb-2">
        <h2 className="text-base font-semibold tracking-tight">Upcoming</h2>
        <p className="text-xs text-muted-foreground">Bills and installments due next</p>
      </header>
      <ul className="divide-y divide-border/60 border-y border-border/60">
        {Array.from({ length: UPCOMING_ROWS }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <li key={index} className={cn("flex items-center gap-3", ROW_HEIGHT)}>
            <Skeleton className="size-9 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3.5 w-32" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="ml-auto h-4 w-20" />
              <Skeleton className="ml-auto h-3.5 w-16" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
