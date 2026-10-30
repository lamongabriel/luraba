"use client";

import type { AssetDetail } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";

import { GradientAreaChart } from "@/components/charts";
import { AmountDisplay } from "@/components/display";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/finance";

import { INDEXER_LABELS, RATE_FORM_LABELS } from "./constants";
import { fractionToPercentText } from "./format";
import { MetricCard } from "./metric-card";
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Curve value"
            value={money(position.curveValue)}
            detail={position.accruedIsEstimated ? "Estimated (index not published yet)" : undefined}
          />
          <MetricCard
            label="Market value"
            value={position.marketValue === null ? "—" : money(position.marketValue)}
            detail={position.marketValue === null ? "No buyback price" : "Provider price"}
          />
          <MetricCard
            label="Estimated IR + IOF"
            value={money(position.estimatedIr + position.estimatedIof)}
            detail={
              position.nextIrBracketInDays !== null
                ? `Lower IR bracket in ${position.nextIrBracketInDays} days`
                : "At the lowest bracket"
            }
          />
          <MetricCard
            label="Net if redeemed today"
            value={money(position.netValue)}
            detail={
              position.iofDaysRemaining
                ? `IOF applies for ${position.iofDaysRemaining} more days`
                : undefined
            }
          />
        </div>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Gross" value={money(detail.fixedIncomeProjection.grossValue)} />
              <MetricCard
                label="After taxes"
                value={money(detail.fixedIncomeProjection.netValue)}
              />
            </div>
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
