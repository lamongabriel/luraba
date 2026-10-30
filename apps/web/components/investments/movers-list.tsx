"use client";

import type { InvestmentDashboard } from "@luraba/contracts";
import Link from "next/link";

import { AmountDisplay } from "@/components/display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { PercentChange } from "./percent-change";
import { useInvestmentFormat } from "./use-investment-format";

/** The biggest moves of the day among your holdings. */
export function MoversList({
  movers,
  currencyCode,
}: {
  movers: InvestmentDashboard["movers"];
  currencyCode: string;
}) {
  const format = useInvestmentFormat();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's movers</CardTitle>
      </CardHeader>
      <CardContent>
        {movers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No price moves yet today.</p>
        ) : (
          <ul className="divide-y">
            {movers.map((mover) => (
              <li key={mover.assetId} className="flex items-center justify-between gap-3 py-2">
                <Link
                  href={`/investments/assets/${mover.assetId}`}
                  className="font-medium hover:underline"
                >
                  {mover.symbol}
                </Link>
                <div className="flex items-center gap-3">
                  <PercentChange value={mover.changePercent} />
                  <AmountDisplay
                    amount={mover.changeValue}
                    currencyCode={currencyCode}
                    precision={format.precisionOf(currencyCode)}
                    language={format.language}
                    kind="auto"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
