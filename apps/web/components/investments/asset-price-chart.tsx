"use client";

import type { AssetDetail } from "@luraba/contracts";
import { formatShortDate } from "@luraba/domain";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import { ChartState } from "@/components/charts/chart-state";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import { useInvestmentFormat } from "./use-investment-format";

const BUY_TYPES = new Set(["BUY", "SUBSCRIPTION", "FI_APPLICATION", "BONUS_SHARES"]);
const SELL_TYPES = new Set(["SELL", "FI_REDEMPTION", "FI_MATURITY"]);

/** Closing prices with your buys and sells marked and a line at your average cost. */
export function AssetPriceChart({
  detail,
  currencyCode,
  status = "ready",
}: {
  detail: Pick<AssetDetail, "chart" | "markers" | "averageCostLine">;
  currencyCode: string;
  status?: "ready" | "loading" | "error";
}) {
  const format = useInvestmentFormat();
  const data = detail.chart.map((point) => ({ date: point.date, close: Number(point.close) }));
  const dates = new Set(data.map((point) => point.date));
  // A trade on a weekend or a holiday has no close that day: pin it to the next session shown.
  const sessionFor = (date: string) => data.find((point) => point.date >= date)?.date;
  const markers = detail.markers
    .filter(
      (marker) =>
        marker.price !== null && (BUY_TYPES.has(marker.type) || SELL_TYPES.has(marker.type)),
    )
    .map((marker) => ({
      ...marker,
      at: dates.has(marker.date) ? marker.date : sessionFor(marker.date),
    }))
    .filter((marker): marker is typeof marker & { at: string } => Boolean(marker.at));
  const average = detail.averageCostLine ? Number(detail.averageCostLine) : null;
  const price = (value: number) => format.unitPrice(String(value), currencyCode);

  return (
    <ChartState title="Price history" status={status} isEmpty={data.length === 0}>
      <ChartContainer
        config={{ close: { label: "Close", color: "var(--color-chart-1)" } }}
        className="h-72 w-full"
      >
        <LineChart data={data} accessibilityLayer margin={{ top: 12, right: 8, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
            tickFormatter={(value: string) => formatShortDate(value, format.language)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={64}
            domain={["auto", "auto"]}
            tickFormatter={(value: number) => price(value)}
          />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value) => price(Number(value))} />}
          />
          <Line dataKey="close" stroke="var(--color-close)" strokeWidth={2} dot={false} />
          {average !== null ? (
            <ReferenceLine
              y={average}
              stroke="var(--color-chart-4)"
              strokeDasharray="4 4"
              label={{ value: "Avg. cost", position: "insideTopRight", fontSize: 11 }}
            />
          ) : null}
          {markers.map((marker) => (
            <ReferenceDot
              key={`${marker.date}-${marker.type}-${marker.quantity}`}
              x={marker.at}
              y={Number(marker.price)}
              r={4}
              fill={
                SELL_TYPES.has(marker.type) ? "var(--color-destructive)" : "var(--color-chart-2)"
              }
              stroke="var(--color-background)"
              ifOverflow="extendDomain"
            />
          ))}
        </LineChart>
      </ChartContainer>
    </ChartState>
  );
}
