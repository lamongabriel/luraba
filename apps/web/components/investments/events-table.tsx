"use client";

import { Delete02Icon, MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { InvestmentEvent } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import Link from "next/link";

import { AmountDisplay, AssetDisplay, InvestmentEventTypeDisplay } from "@/components/display";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { majorToMinorUnits } from "@/lib/finance";

import { useInvestmentFormat } from "./use-investment-format";

/** Event amounts are exact decimal strings in major units; show them through the shared amount display. */
function EventAmount({ event }: { event: InvestmentEvent }) {
  const format = useInvestmentFormat();
  const precision = format.precisionOf(event.currencyCode);
  const cashOut = [
    "BUY",
    "SUBSCRIPTION",
    "FI_APPLICATION",
    "WITHDRAWAL",
    "TRANSFER_OUT",
    "FEE",
    "TAX_PAYMENT",
  ].includes(event.type);
  const hasCash = Number(event.netAmount) !== 0;
  if (!hasCash) return <span className="text-muted-foreground">—</span>;
  return (
    <AmountDisplay
      amount={majorToMinorUnits(Number(event.netAmount), precision)}
      currencyCode={event.currencyCode}
      precision={precision}
      language={format.language}
      kind={cashOut ? "expense" : "income"}
    />
  );
}

/** The investment ledger as a table, with edit and delete for people who may write. */
export function EventsTable({
  events,
  onEdit,
  onDelete,
}: {
  events: InvestmentEvent[];
  onEdit?: (event: InvestmentEvent) => void;
  onDelete?: (event: InvestmentEvent) => void;
}) {
  const format = useInvestmentFormat();
  const can = useCan();
  const canWrite = can(PERMISSIONS.INVESTMENTS_WRITE);
  const canDelete = can(PERMISSIONS.INVESTMENTS_DELETE);
  const showActions = (canWrite && onEdit) || (canDelete && onDelete);

  return (
    <div className="min-w-0 max-w-full overflow-x-auto rounded-md border">
      <Table className="min-w-[52rem]">
        <TableHeader>
          <TableRow data-hover-disabled="true">
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Asset</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {showActions ? <TableHead className="w-10" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="whitespace-nowrap">
                {formatShortDate(event.tradeDate, format.language)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <InvestmentEventTypeDisplay type={event.type} size="xs" />
                  {event.source !== "manual" ? (
                    <Badge variant="secondary" className="capitalize">
                      {event.source.replaceAll("_", " ")}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                {event.assetId && event.assetSymbol ? (
                  <Link href={`/investments/assets/${event.assetId}`} className="hover:underline">
                    <AssetDisplay
                      asset={{ symbol: event.assetSymbol, name: event.assetName ?? "" }}
                      size="xs"
                    />
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Cash</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {event.quantity ? format.quantity(event.quantity) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {event.unitPrice ? format.unitPrice(event.unitPrice, event.currencyCode) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <EventAmount event={event} />
              </TableCell>
              {showActions ? (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Transaction actions"
                        data-row-action
                      >
                        <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canWrite && onEdit ? (
                        <DropdownMenuItem onSelect={() => onEdit(event)}>
                          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                          Edit
                        </DropdownMenuItem>
                      ) : null}
                      {canDelete && onDelete ? (
                        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(event)}>
                          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                          Delete
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
