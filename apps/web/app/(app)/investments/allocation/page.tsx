"use client";

import type { AllocationDimension } from "@luraba/contracts";
import { ALLOCATION_DIMENSIONS } from "@luraba/contracts";
import { keepPreviousData } from "@tanstack/react-query";
import * as React from "react";

import { AmountDisplay } from "@/components/display";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { AllocationChart } from "@/components/investments/allocation-chart";
import { AllocationTargetsEditor } from "@/components/investments/allocation-targets-editor";
import { DIMENSION_LABELS } from "@/components/investments/constants";
import { ScopeBar } from "@/components/investments/scope-bar";
import { useInvestmentFormat } from "@/components/investments/use-investment-format";
import { scopeQuery, useInvestmentScope } from "@/components/investments/use-investment-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyInput } from "@/components/ui/masked-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useAllocationQuery,
  useRebalanceQuery,
} from "@/queries/investments/use-investments-queries";
import { AllocationEmpty } from "./_empty";
import { AllocationError } from "./_error";
import { AllocationLoading } from "./_loading";

function RebalancePlanner({
  portfolioId,
  dimension,
  currencyCode,
}: {
  portfolioId: string;
  dimension: AllocationDimension;
  currencyCode: string;
}) {
  const format = useInvestmentFormat();
  const precision = format.precisionOf(currencyCode);
  const [contribution, setContribution] = React.useState("");
  const [applied, setApplied] = React.useState("");
  React.useEffect(() => {
    const timer = window.setTimeout(() => setApplied(contribution), 400);
    return () => window.clearTimeout(timer);
  }, [contribution]);
  const plan = useRebalanceQuery(
    { portfolioId, dimension, contribution: applied || "0" },
    { enabled: Boolean(applied) && Number(applied) > 0, placeholderData: keepPreviousData },
  );

  return (
    <div className="space-y-3">
      <div className="max-w-xs space-y-1.5">
        <label htmlFor="contribution" className="text-xs font-medium">
          New money to invest ({currencyCode})
        </label>
        <MoneyInput
          id="contribution"
          value={contribution}
          precision={precision}
          language={format.language}
          onValueChange={setContribution}
        />
      </div>
      {plan.isError ? (
        <p className="text-xs text-destructive" role="alert">
          {plan.error.message}
        </p>
      ) : null}
      {plan.data && Number(applied) > 0 ? (
        <div className="min-w-0 overflow-x-auto rounded-md border">
          <Table className="min-w-[36rem]">
            <TableHeader>
              <TableRow data-hover-disabled="true">
                <TableHead>Bucket</TableHead>
                <TableHead className="text-right">Now</TableHead>
                <TableHead className="text-right">Target</TableHead>
                <TableHead className="text-right">Buy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plan.data.rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {format.percent(row.currentPercent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {format.percent(row.targetPercent)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.buy > 0 ? (
                      <AmountDisplay
                        amount={row.buy}
                        currencyCode={plan.data.reportingCurrencyCode}
                        precision={precision}
                        language={format.language}
                        kind="income"
                        showSign={false}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Enter an amount to see where to put it so you move toward your targets.
        </p>
      )}
    </div>
  );
}

export default function AllocationPage() {
  const format = useInvestmentFormat();
  const scope = useInvestmentScope();
  const [dimension, setDimension] = React.useState<AllocationDimension>("class");
  const allocation = useAllocationQuery(
    { ...scopeQuery(scope), dimension },
    { placeholderData: keepPreviousData },
  );

  let content: React.ReactNode;
  if (allocation.isPending) {
    content = <AllocationLoading />;
  } else if (allocation.isError) {
    content = (
      <AllocationError
        message={allocation.error?.message}
        onRetry={() => void allocation.refetch()}
      />
    );
  } else if (allocation.data.slices.length === 0) {
    content = <AllocationEmpty />;
  } else {
    const data = allocation.data;
    const currencyCode = data.reportingCurrencyCode;
    content = (
      <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>By {DIMENSION_LABELS[dimension].toLowerCase()}</CardTitle>
            </CardHeader>
            <CardContent>
              <AllocationChart
                title="Allocation"
                slices={data.slices}
                currencyCode={currencyCode}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {data.slices.map((slice) => (
                  <li key={slice.key} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate">{slice.label}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {format.percent(slice.percent)}
                      </span>
                      <AmountDisplay
                        amount={slice.value}
                        currencyCode={currencyCode}
                        precision={format.precisionOf(currencyCode)}
                        language={format.language}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {scope.portfolioId ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Targets</CardTitle>
              </CardHeader>
              <CardContent>
                <AllocationTargetsEditor
                  portfolioId={scope.portfolioId}
                  dimension={dimension}
                  rows={data.targets}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Rebalance with new money</CardTitle>
              </CardHeader>
              <CardContent>
                <RebalancePlanner
                  portfolioId={scope.portfolioId}
                  dimension={dimension}
                  currencyCode={currencyCode}
                />
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Choose a portfolio above to set targets and plan where new money should go.
          </p>
        )}
      </div>
    );
  }

  return (
    <InternalPageLayout
      title="Allocation"
      subtitle="How your money is spread, how far it is from your targets, and where to invest next."
      actions={
        <Select
          value={dimension}
          onValueChange={(value) => setDimension(value as AllocationDimension)}
        >
          <SelectTrigger className="w-40" aria-label="Group by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALLOCATION_DIMENSIONS.map((item) => (
              <SelectItem key={item} value={item}>
                {DIMENSION_LABELS[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <ScopeBar scope={scope} showNet={false} />
      {content}
    </InternalPageLayout>
  );
}
