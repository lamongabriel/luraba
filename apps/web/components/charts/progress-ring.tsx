import type * as React from "react";

import { cn } from "@/lib/utils";

import { CHART_TONE_COLOR, type ChartTone } from "./chart-theme";

export interface ProgressRingProps {
  /** How full the ring is, 0-100 (anything outside is capped). */
  percent: number;
  tone?: ChartTone;
  /** Any CSS color; overrides `tone` (a category's own color). */
  color?: string;
  /** Diameter in pixels. */
  size?: number;
  /** Text or icon in the middle ("75%"). */
  children?: React.ReactNode;
  /** Spoken description, e.g. "75% of the budget spent". */
  label: string;
  className?: string;
}

/**
 * A small circular progress indicator that fills as `percent` grows. Pure SVG (no chart runtime), so
 * lists can draw dozens of them: one per category budget, goal or invoice.
 */
export function ProgressRing({
  percent,
  tone = "neutral",
  color,
  size = 64,
  children,
  label,
  className,
}: ProgressRingProps) {
  const filled = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));

  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 36 36" className="size-full -rotate-90" aria-hidden="true">
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="4"
          pathLength={100}
        />
        {filled > 0 ? (
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            stroke={color ?? CHART_TONE_COLOR[tone]}
            strokeWidth="4"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${filled} 100`}
          />
        ) : null}
      </svg>
      {children ? (
        <div className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-semibold tabular-nums">
          {children}
        </div>
      ) : null}
    </div>
  );
}
