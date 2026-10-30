"use client";

import type { ApuracaoLine } from "@luraba/contracts";
import { todayISODate } from "@luraba/domain";
import { keepPreviousData } from "@tanstack/react-query";
import * as React from "react";

import { AmountDisplay, AssetDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { TAX_DISCLAIMER } from "@/components/investments/constants";
import { DarfPaidSheet } from "@/components/investments/forms/darf-paid-sheet";
import { MetricCard } from "@/components/investments/metric-card";
import { ApuracaoTable, UsGainsTable } from "@/components/investments/tax-tables";
import { useInvestmentFormat } from "@/components/investments/use-investment-format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useInvestmentAccountsQuery,
  useInvestmentTaxesQuery,
} from "@/queries/investments/use-investments-queries";

const ALL = "all";

export default function TaxesPage() {
  const format = useInvestmentFormat();
  const currentYear = Number(todayISODate().slice(0, 4));
  const [year, setYear] = React.useState(currentYear);
  const [accountId, setAccountId] = React.useState<string>(ALL);
  const [paying, setPaying] = React.useState<ApuracaoLine | undefined>();
  const accounts = useInvestmentAccountsQuery();
  const taxes = useInvestmentTaxesQuery(
    { year, accountId: accountId === ALL ? undefined : accountId },
    { placeholderData: keepPreviousData },
  );
  const years = Array.from({ length: 6 }, (_, index) => currentYear - index);

  let content: React.ReactNode;
  if (taxes.isPending) {
    content = <Skeleton className="h-72 rounded-xl bg-muted/50" />;
  } else if (taxes.isError) {
    content = (
      <ErrorState
        title="Couldn't load your tax report"
        description={taxes.error.message}
        onRetry={() => void taxes.refetch()}
      />
    );
  } else {
    const data = taxes.data;
    const currencyCode = data.annual.reportingCurrencyCode;
    const precision = format.precisionOf(currencyCode);
    const money = (amount: number, kind: "neutral" | "auto" = "neutral") => (
      <AmountDisplay
        amount={amount}
        currencyCode={currencyCode}
        precision={precision}
        language={format.language}
        kind={kind}
        size="md"
      />
    );
    const nothing =
      data.apuracao.length === 0 &&
      data.usGains.length === 0 &&
      data.annual.holdingsAtCost.length === 0;
    content = nothing ? (
      <EmptyState
        title={`No taxable activity in ${year}`}
        description="Sales, income and holdings for the year appear here once you have transactions."
      />
    ) : (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Realized result" value={money(data.annual.realizedResult, "auto")} />
          <MetricCard label="Tax-exempt income" value={money(data.annual.exemptIncome)} />
          <MetricCard label="Taxed at the source" value={money(data.annual.taxedAtSource)} />
          <MetricCard
            label="Exclusive-tax income"
            value={money(data.annual.exclusiveTaxIncome)}
            detail={
              data.annual.offshoreEstimatedTax > 0 ? (
                <span>Offshore est. tax {money(data.annual.offshoreEstimatedTax)}</span>
              ) : undefined
            }
          />
        </div>

        {data.apuracao.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Monthly assessment (Brazil)</CardTitle>
            </CardHeader>
            <CardContent>
              <ApuracaoTable
                lines={data.apuracao}
                currencyCode={currencyCode}
                onMarkPaid={setPaying}
              />
            </CardContent>
          </Card>
        ) : null}

        {data.usGains.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Realized gains by lot (United States)</CardTitle>
            </CardHeader>
            <CardContent>
              <UsGainsTable gains={data.usGains} />
            </CardContent>
          </Card>
        ) : null}

        {data.annual.holdingsAtCost.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Holdings on December 31 at cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="min-w-0 overflow-x-auto rounded-md border">
                <Table className="min-w-[32rem]">
                  <TableHeader>
                    <TableRow data-hover-disabled="true">
                      <TableHead>Asset</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.annual.holdingsAtCost.map((row) => (
                      <TableRow key={row.assetId}>
                        <TableCell>
                          <AssetDisplay asset={row} size="xs" />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {format.quantity(row.quantity)}
                        </TableCell>
                        <TableCell className="text-right">{money(row.cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs text-muted-foreground">{data.disclaimer || TAX_DISCLAIMER}</p>
        <DarfPaidSheet
          line={paying}
          accountId={accountId === ALL ? undefined : accountId}
          precision={precision}
          onOpenChange={(open) => {
            if (!open) setPaying(undefined);
          }}
        />
      </div>
    );
  }

  return (
    <InternalPageLayout
      title="Taxes"
      subtitle="Estimated tax on your sales and income, with the figures to file and pay."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(year)} onValueChange={(value) => setYear(Number(value))}>
          <SelectTrigger className="w-28" aria-label="Tax year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((item) => (
              <SelectItem key={item} value={String(item)}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-52" aria-label="Account">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {(accounts.data ?? []).map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {content}
    </InternalPageLayout>
  );
}
