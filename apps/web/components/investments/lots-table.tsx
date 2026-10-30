"use client";

import type { AssetDetail } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";

import { AmountDisplay } from "@/components/display";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useInvestmentFormat } from "./use-investment-format";

/** Open tax lots: when each purchase was made and what is left of it. */
export function LotsTable({
  lots,
  currencyCode,
  assetCurrencyCode,
}: {
  lots: AssetDetail["lots"];
  currencyCode: string;
  assetCurrencyCode: string;
}) {
  const format = useInvestmentFormat();
  return (
    <div className="min-w-0 overflow-x-auto rounded-md border">
      <Table className="min-w-[32rem]">
        <TableHeader>
          <TableRow data-hover-disabled="true">
            <TableHead>Acquired</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit cost</TableHead>
            <TableHead className="text-right">Cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.map((lot) => (
            <TableRow key={lot.lotId}>
              <TableCell>{formatShortDate(lot.acquiredDate, format.language)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {format.quantity(lot.quantity)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {format.unitPrice(lot.unitCost, assetCurrencyCode)}
              </TableCell>
              <TableCell className="text-right">
                <AmountDisplay
                  amount={lot.cost}
                  currencyCode={currencyCode}
                  precision={format.precisionOf(currencyCode)}
                  language={format.language}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
