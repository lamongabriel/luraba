import type * as React from "react";

import { cn } from "@/lib/utils";

import { ChartCard, type ChartCardProps } from "./chart-card";
import { CHART_TONE_COLOR, type ChartTone } from "./chart-theme";

export interface GaugeChartCardProps extends Omit<ChartCardProps, "children" | "isEmpty"> {
  /** How full the gauge is, 0-100 (anything outside is capped). */
  percent: number;
  tone?: ChartTone;
  /** The big figure in the middle of the arc (an `AmountDisplay`, a percentage). */
  centerValue: React.ReactNode;
  /** The line under it ("left of $2,000"). */
  centerLabel?: React.ReactNode;
  /** Spoken description, e.g. "45% of the monthly budget spent". */
  gaugeLabel: string;
  /** Extra content under the arc, still inside the card's fixed height (a row of stats). */
  children?: React.ReactNode;
}

/**
 * A semicircle (speedometer) gauge in a chart card: one number read at a glance, with the arc
 * filling and changing color as `percent` and `tone` move. Everything under the arc is `children`,
 * so loading, error and the real card share one height.
 */
export function GaugeChartCard({
  percent,
  tone = "neutral",
  centerValue,
  centerLabel,
  gaugeLabel,
  children,
  heightClassName = "h-72",
  ...card
}: GaugeChartCardProps) {
  const filled = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));

  return (
    <ChartCard {...card} heightClassName={heightClassName}>
      <div className="flex h-full flex-col justify-between gap-4">
        <div role="img" aria-label={gaugeLabel} className="relative mx-auto w-full max-w-sm">
          <svg viewBox="0 0 200 106" className="w-full" aria-hidden="true">
            <path
              d="M 12 100 A 88 88 0 0 1 188 100"
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth="14"
              strokeLinecap="round"
              pathLength={100}
            />
            {filled > 0 ? (
              <path
                d="M 12 100 A 88 88 0 0 1 188 100"
                fill="none"
                stroke={CHART_TONE_COLOR[tone]}
                strokeWidth="14"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${filled} 100`}
              />
            ) : null}
          </svg>
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{centerValue}</div>
            {centerLabel ? (
              <div className={cn("text-xs text-muted-foreground")}>{centerLabel}</div>
            ) : null}
          </div>
        </div>
        {children}
      </div>
    </ChartCard>
  );
}
