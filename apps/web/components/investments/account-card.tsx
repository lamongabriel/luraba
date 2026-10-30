"use client";

import type { InvestmentAccount } from "@luraba/contracts";
import Link from "next/link";

import { AccountDisplay, AmountDisplay } from "@/components/display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { COST_BASIS_LABELS, TAX_PROFILE_LABELS } from "./constants";
import { useInvestmentFormat } from "./use-investment-format";

/** One investment account: value, cash per currency and how it is configured. */
export function AccountCard({ account }: { account: InvestmentAccount }) {
  const format = useInvestmentFormat();
  const precision = format.precisionOf(account.currencyCode);
  return (
    <Card className="transition-colors hover:border-foreground/20">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/investments/accounts/${account.id}`} className="min-w-0 hover:underline">
            <AccountDisplay account={account} size="md" detail="type" />
          </Link>
          <AmountDisplay
            amount={account.totalValue}
            currencyCode={account.currencyCode}
            precision={precision}
            language={format.language}
            size="md"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{COST_BASIS_LABELS[account.costBasisMethod]}</Badge>
          <Badge variant="outline">{TAX_PROFILE_LABELS[account.taxProfile]}</Badge>
          <Badge variant="outline">{account.currencyCode}</Badge>
        </div>
        {account.cash.length > 0 ? (
          <dl className="grid gap-1 text-xs">
            <dt className="text-muted-foreground">Cash</dt>
            {account.cash.map((balance) => (
              <dd key={balance.currencyCode}>
                <AmountDisplay
                  amount={balance.amount}
                  currencyCode={balance.currencyCode}
                  precision={format.precisionOf(balance.currencyCode)}
                  language={format.language}
                  kind="auto"
                  showSign={false}
                />
              </dd>
            ))}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
}
