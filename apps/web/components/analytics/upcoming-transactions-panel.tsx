"use client";

import { Calendar03Icon, RepeatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { UpcomingTransaction } from "@luraba/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import { formatShortDate } from "@/lib/format";

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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Upcoming transactions</CardTitle>
        <HugeiconsIcon icon={Calendar03Icon} className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No upcoming transactions.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <li key={`${row.sourceType}-${row.sourceId}-${row.effectiveDate}`}>
                <Button
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 rounded-none px-0 py-3 text-left hover:bg-transparent"
                  onClick={() => onSelect?.(row)}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground">
                    <HugeiconsIcon icon={RepeatIcon} className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium">{row.description}</span>
                      <Badge variant="outline" className="h-4 px-1 text-[0.55rem]">
                        {row.sourceType === "recurring_bill" ? "Recurring" : "Installment"}
                      </Badge>
                    </span>
                    <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
                      {formatShortDate(row.effectiveDate, language)}
                      {row.accountName ? ` · ${row.accountName}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium">
                    {formatCurrency(row.amount, row.currencyCode, language, undefined, precision)}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
