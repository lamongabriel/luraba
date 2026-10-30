"use client";

import { useParams } from "next/navigation";
import * as React from "react";

import { VerticalBarChart } from "@/components/charts";
import { AmountDisplay, AssetDisplay } from "@/components/display";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { AssetPriceChart } from "@/components/investments/asset-price-chart";
import { EventsTable } from "@/components/investments/events-table";
import { FixedIncomePanel } from "@/components/investments/fixed-income-panel";
import { AssetSheet, isFixedIncomeClass } from "@/components/investments/forms/asset-form";
import { EventSheet } from "@/components/investments/forms/event-sheet";
import { ManualPriceSheet } from "@/components/investments/forms/manual-price-sheet";
import { LotsTable } from "@/components/investments/lots-table";
import { MetricCard } from "@/components/investments/metric-card";
import { PercentChange } from "@/components/investments/percent-change";
import { SegmentedControl } from "@/components/investments/segmented-control";
import { useInvestmentFormat } from "@/components/investments/use-investment-format";
import { PERMISSIONS, PermissionButton, ResourceAccessBoundary } from "@/components/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDisclosure } from "@/hooks/use-disclosure";
import { formatCurrency } from "@/lib/finance";
import {
  useAssetDetailQuery,
  useInvestmentSettingsQuery,
} from "@/queries/investments/use-investments-queries";

const RANGES = ["5D", "1M", "6M", "YTD", "1Y", "5Y", "MAX"] as const;

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const format = useInvestmentFormat();
  const [range, setRange] = React.useState<(typeof RANGES)[number]>("1Y");
  const detail = useAssetDetailQuery(id, { range });
  const settings = useInvestmentSettingsQuery();
  const eventSheet = useDisclosure();
  const editSheet = useDisclosure();
  const priceSheet = useDisclosure();

  if (detail.isPending) return <Skeleton className="h-96 rounded-xl bg-muted/50" />;
  if (detail.isError) {
    return (
      <ResourceAccessBoundary
        error={detail.error}
        resourceName="asset"
        backHref="/investments/holdings"
        fallback={
          <ErrorState
            title="Couldn't load this asset"
            description={detail.error.message}
            onRetry={() => void detail.refetch()}
          />
        }
      >
        {null}
      </ResourceAccessBoundary>
    );
  }

  const data = detail.data;
  const { asset, position } = data;
  // Position amounts are in the household reporting currency; prices are in the asset currency.
  const reporting = settings.data?.reportingCurrencyCode ?? asset.currencyCode;
  const precision = format.precisionOf(reporting);
  const money = (amount: number, kind: "neutral" | "auto" = "neutral") => (
    <AmountDisplay
      amount={amount}
      currencyCode={reporting}
      precision={precision}
      language={format.language}
      kind={kind}
      size="md"
    />
  );
  const fixedIncome = isFixedIncomeClass(asset.assetClass);

  return (
    <InternalPageLayout
      title={asset.symbol}
      subtitle={
        <span className="inline-flex flex-wrap items-center gap-3">
          <AssetDisplay asset={asset} size="xs" detail="class" />
          {position?.price ? (
            <span className="inline-flex items-center gap-2">
              <span className="font-medium tabular-nums">
                {format.unitPrice(position.price.price, position.price.currencyCode)}
              </span>
              <PercentChange value={position.price.changePercent} />
            </span>
          ) : null}
        </span>
      }
      back={{ href: "/investments/holdings", label: "Holdings" }}
      actions={
        <div className="flex items-center gap-2">
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            variant="outline"
            onClick={priceSheet.onOpen}
          >
            Set price
          </PermissionButton>
          <PermissionButton
            permission={PERMISSIONS.INVESTMENTS_WRITE}
            variant="outline"
            onClick={editSheet.onOpen}
          >
            Edit
          </PermissionButton>
          <PermissionButton permission={PERMISSIONS.INVESTMENTS_WRITE} onClick={eventSheet.onOpen}>
            New transaction
          </PermissionButton>
        </div>
      }
    >
      {position ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Quantity"
            value={format.quantity(position.quantity)}
            detail={`Average cost ${format.unitPrice(position.averageCost, asset.currencyCode)}`}
          />
          <MetricCard
            label="Value"
            value={money(position.marketValue)}
            detail={`${format.percent(position.percentOfPortfolio)} of portfolio`}
          />
          <MetricCard
            label="Unrealized P&L"
            value={money(position.unrealizedPnl, "auto")}
            detail={<PercentChange value={position.unrealizedPnlPercent} />}
          />
          <MetricCard
            label="Income received"
            value={money(position.income)}
            detail={<span>Realized {money(position.realizedPnl, "auto")}</span>}
          />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">You don't hold this asset right now.</p>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle>Price</CardTitle>
          <SegmentedControl
            label="Range"
            value={range}
            onChange={setRange}
            options={RANGES.map((value) => ({ value, label: value === "MAX" ? "All" : value }))}
          />
        </CardHeader>
        <CardContent>
          <AssetPriceChart detail={data} currencyCode={asset.currencyCode} />
          <p className="mt-2 text-xs text-muted-foreground">
            Green dots are your buys and red dots your sales. The dashed line is your average cost.
          </p>
        </CardContent>
      </Card>

      {fixedIncome && asset.fixedIncome ? (
        <FixedIncomePanel detail={data} currencyCode={reporting} />
      ) : null}

      {data.lots.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Open lots</CardTitle>
          </CardHeader>
          <CardContent>
            <LotsTable
              lots={data.lots}
              currencyCode={reporting}
              assetCurrencyCode={asset.currencyCode}
            />
          </CardContent>
        </Card>
      ) : null}

      {data.incomeByMonth.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Income by month</CardTitle>
          </CardHeader>
          <CardContent>
            <VerticalBarChart
              title="Income by month"
              data={data.incomeByMonth.map((row) => ({ month: row.month, net: row.net }))}
              categoryKey="month"
              valueKey="net"
              valueLabel="Income"
              formatValue={(value) =>
                formatCurrency(value, reporting, format.language, undefined, precision)
              }
            />
          </CardContent>
        </Card>
      ) : null}

      {data.fundamentals ? (
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.fundamentals.description ? (
              <p className="text-muted-foreground">{data.fundamentals.description}</p>
            ) : null}
            <dl className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["Sector", data.fundamentals.sector],
                  ["Industry", data.fundamentals.industry],
                  ["Market cap", data.fundamentals.marketCap],
                  ["Dividend yield", data.fundamentals.dividendYield],
                  ["P/E ratio", data.fundamentals.peRatio],
                ] as const
              )
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
            </dl>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions for this asset yet.</p>
          ) : (
            <EventsTable events={data.events} />
          )}
        </CardContent>
      </Card>

      <EventSheet
        open={eventSheet.isOpen}
        onOpenChange={eventSheet.setIsOpen}
        seed={{ assetId: asset.id }}
      />
      <AssetSheet open={editSheet.isOpen} onOpenChange={editSheet.setIsOpen} asset={asset} />
      <ManualPriceSheet
        open={priceSheet.isOpen}
        onOpenChange={priceSheet.setIsOpen}
        asset={asset}
      />
    </InternalPageLayout>
  );
}
