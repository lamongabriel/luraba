"use client";

import type { InvestmentDashboard } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";

import { AmountDisplay } from "@/components/display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useInvestmentFormat } from "./use-investment-format";

const KIND_LABEL = { maturity: "Maturity", coupon: "Coupon", lock_in_end: "Liquidity" } as const;

/** Maturities, coupons and end of lock-in dates coming up. */
export function UpcomingList({
  items,
  currencyCode,
}: {
  items: InvestmentDashboard["upcoming"];
  currencyCode: string;
}) {
  const format = useInvestmentFormat();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is due soon.</p>
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li
                key={`${item.assetId}-${item.kind}-${item.date}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{item.symbol}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatShortDate(item.date, format.language)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{KIND_LABEL[item.kind]}</Badge>
                  {item.amount !== null ? (
                    <AmountDisplay
                      amount={item.amount}
                      currencyCode={currencyCode}
                      precision={format.precisionOf(currencyCode)}
                      language={format.language}
                    />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
