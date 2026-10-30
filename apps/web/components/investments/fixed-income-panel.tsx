"use client";

import type { AssetDetail } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";

import { GradientAreaChart } from "@/components/charts";
import { AmountDisplay } from "@/components/display";
import { KpiCard, KpiGrid } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";
import { INDEXER_LABELS, RATE_FORM_LABELS } from "./constants";
import { fractionToPercentText } from "./format";
import { useInvestmentFormat } from "./use-investment-format";

/**
 * Fixed-income view of an asset: the curve value against the market price, what taxes would take
 * today, how soon a lower bracket arrives, and the projection to maturity.
 */
export function FixedIncomePanel({
  detail,
  currencyCode,
}: {
  detail: AssetDetail;
  currencyCode: string;
}) {
  const format = useInvestmentFormat();
  const precision = format.precisionOf(currencyCode);
  const terms = detail.asset.fixedIncome;
  const position = detail.position?.fixedIncome ?? null;
  const money = (amount: number) => (
    <AmountDisplay
      amount={amount}
      currencyCode={currencyCode}
      precision={precision}
      language={format.language}
      size="md"
    />
  );

  if (!terms) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{INDEXER_LABELS[terms.indexer]}</Badge>
        <Badge variant="outline">
          {RATE_FORM_LABELS[terms.rateForm]}: {format.percent(fractionToPercentText(terms.rate))}
        </Badge>
        {terms.maturityDate ? (
          <Badge variant="outline">
            Matures {formatShortDate(terms.maturityDate, format.language)}
          </Badge>
        ) : null}
        {terms.fgcCovered ? <Badge variant="secondary">FGC guaranteed</Badge> : null}
      </div>

      {position ? (
        <KpiGrid columns={4}>
          <KpiCard
            title="Curve value"
            value={money(position.curveValue)}
            description={
              position.accruedIsEstimated ? "Estimated (index not published yet)" : undefined
            }
          />
          <KpiCard
            title="Market value"
            value={position.marketValue === null ? "—" : money(position.marketValue)}
            description={position.marketValue === null ? "No buyback price" : "Provider price"}
          />
          <KpiCard
            title="Estimated IR + IOF"
            value={money(position.estimatedIr + position.estimatedIof)}
            description={
              position.nextIrBracketInDays !== null
                ? `Lower IR bracket in ${position.nextIrBracketInDays} days`
                : "At the lowest bracket"
            }
          />
          <KpiCard
            title="Net if redeemed today"
            value={money(position.netValue)}
            description={
              position.iofDaysRemaining
                ? `IOF applies for ${position.iofDaysRemaining} more days`
                : undefined
            }
          />
        </KpiGrid>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Accrual curve</CardTitle>
        </CardHeader>
        <CardContent>
          <GradientAreaChart
            title="Accrual curve"
            data={detail.fixedIncomeCurve.map((point) => ({
              date: formatShortDate(point.date, format.language),
              value: point.value,
            }))}
            categoryKey="date"
            valueKey="value"
            valueLabel="Value"
            formatValue={(value) =>
              formatCurrency(value, currencyCode, format.language, undefined, precision)
            }
          />
        </CardContent>
      </Card>

      {detail.fixedIncomeProjection ? (
        <Card>
          <CardHeader>
            <CardTitle>
              At maturity (
              {formatShortDate(detail.fixedIncomeProjection.maturityDate, format.language)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KpiGrid columns={2}>
              <KpiCard title="Gross" value={money(detail.fixedIncomeProjection.grossValue)} />
              <KpiCard title="After taxes" value={money(detail.fixedIncomeProjection.netValue)} />
            </KpiGrid>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                Income tax brackets by holding time
              </p>
              <ul className="flex flex-wrap gap-2">
                {detail.fixedIncomeProjection.taxBrackets.map((bracket) => (
                  <li key={bracket.fromDay}>
                    <Badge variant="outline">
                      {bracket.toDay === null
                        ? `${bracket.fromDay}+ days`
                        : `${bracket.fromDay}-${bracket.toDay} days`}
                      : {format.percent(bracket.ratePercent)}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
