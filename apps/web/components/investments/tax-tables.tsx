"use client";

import type { ApuracaoLine, TaxReport } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";

import { AmountDisplay, AssetDisplay } from "@/components/display";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DARF_BUCKET_LABELS } from "./constants";
import { useInvestmentFormat } from "./use-investment-format";

/** Brazilian monthly apuração: one row per month and trading bucket, with the DARF to pay. */
export function ApuracaoTable({
  lines,
  currencyCode,
  onMarkPaid,
}: {
  lines: ApuracaoLine[];
  currencyCode: string;
  onMarkPaid?: (line: ApuracaoLine) => void;
}) {
  const format = useInvestmentFormat();
  const precision = format.precisionOf(currencyCode);
  const money = (amount: number, kind: "neutral" | "auto" = "neutral") => (
    <AmountDisplay
      amount={amount}
      currencyCode={currencyCode}
      precision={precision}
      language={format.language}
      kind={kind}
    />
  );
  return (
    <div className="min-w-0 overflow-x-auto rounded-md border">
      <Table className="min-w-[64rem]">
        <TableHeader>
          <TableRow data-hover-disabled="true">
            <TableHead>Month</TableHead>
            <TableHead>Bucket</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead className="text-right">Result</TableHead>
            <TableHead className="text-right">Loss used</TableHead>
            <TableHead className="text-right">Taxable base</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Tax due</TableHead>
            <TableHead>DARF due</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={`${line.month}-${line.bucket}`}>
              <TableCell className="whitespace-nowrap">{line.month}</TableCell>
              <TableCell>{DARF_BUCKET_LABELS[line.bucket]}</TableCell>
              <TableCell className="text-right">{money(line.salesTotal)}</TableCell>
              <TableCell className="text-right">{money(line.result, "auto")}</TableCell>
              <TableCell className="text-right">{money(line.lossUsed)}</TableCell>
              <TableCell className="text-right">{money(line.taxableBase)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {format.percent(line.ratePercent)}
              </TableCell>
              <TableCell className="text-right">{money(line.taxDue)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {line.taxDue > 0 ? (
                  <span className="inline-flex items-center gap-1.5">
                    {formatShortDate(line.dueDate, format.language)}
                    <Badge variant={line.paid ? "secondary" : "outline"}>
                      {line.paid ? "Paid" : `DARF ${line.darfCode}`}
                    </Badge>
                  </span>
                ) : line.belowMinimum ? (
                  <span className="text-xs text-muted-foreground">Below the minimum</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Nothing to pay</span>
                )}
              </TableCell>
              <TableCell>
                {line.taxDue > 0 && !line.paid && onMarkPaid ? (
                  <PermissionButton
                    permission={PERMISSIONS.INVESTMENTS_WRITE}
                    variant="outline"
                    size="sm"
                    onClick={() => onMarkPaid(line)}
                  >
                    Mark paid
                  </PermissionButton>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** United States realized gains per lot, with the holding period that sets the tax rate. */
export function UsGainsTable({ gains }: { gains: TaxReport["usGains"] }) {
  const format = useInvestmentFormat();
  return (
    <div className="min-w-0 overflow-x-auto rounded-md border">
      <Table className="min-w-[52rem]">
        <TableHeader>
          <TableRow data-hover-disabled="true">
            <TableHead>Asset</TableHead>
            <TableHead>Acquired</TableHead>
            <TableHead>Sold</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Proceeds</TableHead>
            <TableHead className="text-right">Cost</TableHead>
            <TableHead className="text-right">Gain</TableHead>
            <TableHead>Term</TableHead>
            <TableHead className="text-right">Est. tax</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gains.map((gain) => {
            const precision = format.precisionOf(gain.currencyCode);
            const money = (amount: number, kind: "neutral" | "auto" = "neutral") => (
              <AmountDisplay
                amount={amount}
                currencyCode={gain.currencyCode}
                precision={precision}
                language={format.language}
                kind={kind}
              />
            );
            return (
              <TableRow key={`${gain.saleEventId}-${gain.acquiredDate}-${gain.quantity}`}>
                <TableCell>
                  <AssetDisplay asset={{ symbol: gain.symbol, name: "" }} size="xs" detail="none" />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatShortDate(gain.acquiredDate, format.language)}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatShortDate(gain.saleDate, format.language)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {format.quantity(gain.quantity)}
                </TableCell>
                <TableCell className="text-right">{money(gain.proceeds)}</TableCell>
                <TableCell className="text-right">{money(gain.cost)}</TableCell>
                <TableCell className="text-right">{money(gain.gain, "auto")}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {gain.term === "LONG" ? "Long-term" : "Short-term"} · {gain.daysHeld} d
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{money(gain.estimatedTax)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
