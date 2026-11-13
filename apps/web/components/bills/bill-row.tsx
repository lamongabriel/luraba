"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

import { AmountDisplay, BillStateDisplay } from "@/components/display";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BILL_ROW_HEIGHT } from "./bill-layout";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A compact row: the due day, the bill and when it repeats, the amount and the state. Opens the bill. */
export function BillRow({
  billId,
  name,
  detail,
  dueDate,
  amount,
  currencyCode,
  state,
  language,
  canMarkPaid,
  onMarkPaid,
}: {
  billId: string;
  name: string;
  detail?: string;
  /** `YYYY-MM-DD`; omit for a row that has no due date (the all-bills list). */
  dueDate?: string;
  amount: number;
  currencyCode: string;
  state: Parameters<typeof BillStateDisplay>[0]["state"] | null;
  language: string;
  canMarkPaid?: boolean;
  onMarkPaid?: () => void;
}) {
  const day = dueDate ? Number(dueDate.slice(8, 10)) : null;
  const month = dueDate ? MONTHS[Number(dueDate.slice(5, 7)) - 1] : null;
  const unpaid = state === "scheduled" || state === "overdue";

  return (
    <li
      className={cn("relative flex items-center gap-3 border-b border-border/60", BILL_ROW_HEIGHT)}
    >
      <Link
        href={`/bills/${billId}`}
        aria-label={`Open ${name}`}
        className="absolute inset-0 rounded-md transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      />
      {day !== null ? (
        <div
          className={cn(
            "pointer-events-none relative flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none",
            state === "overdue" && "bg-destructive/10 text-destructive",
          )}
        >
          <span className="text-sm font-semibold tabular-nums">{day}</span>
          <span className="mt-0.5 text-[0.6rem] uppercase text-muted-foreground">{month}</span>
        </div>
      ) : null}
      <div className="pointer-events-none relative min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {detail ? <p className="truncate text-xs text-muted-foreground">{detail}</p> : null}
      </div>
      <div className="pointer-events-none relative flex shrink-0 flex-col items-end gap-1">
        <AmountDisplay
          amount={amount}
          currencyCode={currencyCode}
          language={language}
          className="font-medium tabular-nums"
        />
        {state ? <BillStateDisplay state={state} /> : null}
      </div>
      {canMarkPaid && unpaid ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${name} actions`}
              className="relative"
            >
              <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onMarkPaid}>Mark paid</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
}
