"use client";

import type { InvestmentPosition } from "@luraba/contracts";
import Link from "next/link";
import * as React from "react";

import { AmountDisplay, AssetDisplay } from "@/components/display";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { PercentChange } from "./percent-change";
import { useInvestmentFormat } from "./use-investment-format";

type SortKey = "symbol" | "marketValue" | "unrealizedPnl" | "pnlPercent" | "today" | "weight";

const SORTERS: Record<SortKey, (a: InvestmentPosition, b: InvestmentPosition) => number> = {
  symbol: (a, b) => a.symbol.localeCompare(b.symbol),
  marketValue: (a, b) => a.marketValue - b.marketValue,
  unrealizedPnl: (a, b) => a.unrealizedPnl - b.unrealizedPnl,
  pnlPercent: (a, b) => Number(a.unrealizedPnlPercent) - Number(b.unrealizedPnlPercent),
  today: (a, b) => a.todayChange - b.todayChange,
  weight: (a, b) => Number(a.percentOfPortfolio) - Number(b.percentOfPortfolio),
};

function SortHead({
  label,
  sortKey,
  active,
  descending,
  onSort,
  align = "right",
}: {
  label: string;
  sortKey: SortKey;
  active: boolean;
  descending: boolean;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <TableHead
      className={align === "right" ? "text-right" : undefined}
      aria-sort={active ? (descending ? "descending" : "ascending") : "none"}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn("-mx-2", align === "right" && "ml-auto")}
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active ? <span aria-hidden>{descending ? "↓" : "↑"}</span> : null}
      </Button>
    </TableHead>
  );
}

/**
 * Holdings table. Amounts are in the reporting currency; the unit price is in the asset currency.
 * `valueMode="net"` shows the value after estimated taxes on a sale today.
 */
export function PositionsTable({
  positions,
  currencyCode,
  valueMode = "market",
  limit,
  className,
}: {
  positions: InvestmentPosition[];
  currencyCode: string;
  valueMode?: "market" | "net";
  /** Show only the first rows (the dashboard preview). */
  limit?: number;
  className?: string;
}) {
  const format = useInvestmentFormat();
  const precision = format.precisionOf(currencyCode);
  const [sort, setSort] = React.useState<{ key: SortKey; descending: boolean }>({
    key: "marketValue",
    descending: true,
  });

  const rows = React.useMemo(() => {
    const sorted = [...positions].sort(SORTERS[sort.key]);
    if (sort.descending) sorted.reverse();
    return limit ? sorted.slice(0, limit) : sorted;
  }, [positions, sort, limit]);

  const onSort = (key: SortKey) =>
    setSort((current) => ({
      key,
      descending: current.key === key ? !current.descending : key !== "symbol",
    }));
  const head = (key: SortKey) => ({
    sortKey: key,
    active: sort.key === key,
    descending: sort.descending,
    onSort,
  });

  return (
    <div className={cn("min-w-0 max-w-full overflow-x-auto rounded-md border", className)}>
      <Table className="min-w-[56rem]">
        <TableHeader>
          <TableRow data-hover-disabled="true">
            <SortHead label="Asset" align="left" {...head("symbol")} />
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Avg. cost</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <SortHead
              label={valueMode === "net" ? "Net value" : "Value"}
              {...head("marketValue")}
            />
            <SortHead label="P&L" {...head("unrealizedPnl")} />
            <SortHead label="P&L %" {...head("pnlPercent")} />
            <SortHead label="Today" {...head("today")} />
            <SortHead label="Weight" {...head("weight")} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((position) => (
            <TableRow key={position.assetId}>
              <TableCell>
                <Link
                  href={`/investments/assets/${position.assetId}`}
                  className="block hover:underline"
                >
                  <AssetDisplay asset={position} detail="name" />
                </Link>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {format.quantity(position.quantity)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {format.unitPrice(position.averageCost, position.currencyCode)}
              </TableCell>
              <TableCell className="text-right">
                {position.price ? (
                  <div className="space-y-0.5">
                    <div className="tabular-nums">
                      {format.unitPrice(position.price.price, position.price.currencyCode)}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-xs">
                      <PercentChange value={position.price.changePercent} />
                      {position.price.isStale ? (
                        <span className="text-muted-foreground" title="Last known price">
                          last close
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">No price</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <AmountDisplay
                  amount={valueMode === "net" ? position.netValue : position.marketValue}
                  currencyCode={currencyCode}
                  precision={precision}
                  language={format.language}
                />
              </TableCell>
              <TableCell className="text-right">
                <AmountDisplay
                  amount={position.unrealizedPnl}
                  currencyCode={currencyCode}
                  precision={precision}
                  language={format.language}
                  kind="auto"
                />
              </TableCell>
              <TableCell className="text-right">
                <PercentChange value={position.unrealizedPnlPercent} />
              </TableCell>
              <TableCell className="text-right">
                <AmountDisplay
                  amount={position.todayChange}
                  currencyCode={currencyCode}
                  precision={precision}
                  language={format.language}
                  kind="auto"
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {format.percent(position.percentOfPortfolio)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
