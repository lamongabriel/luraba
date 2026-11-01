"use client";

import type { TooltipContentProps } from "recharts";

import { cn } from "@/lib/utils";

/**
 * The one tooltip every chart card uses: a title (the bucket or slice name) and one row per series
 * with its swatch, label and value. Callers pass the already-formatted pieces, so money and dates
 * go through the shared formatters.
 */
export function ChartTooltipBody({
  active,
  payload,
  label,
  formatTitle,
  formatValue,
  labels,
  className,
}: Partial<TooltipContentProps<number, string>> & {
  formatTitle?: (label: string) => string;
  formatValue: (value: number, key: string) => string;
  /** Series key -> display label. */
  labels?: Record<string, string>;
  className?: string;
}) {
  if (!active || !payload?.length) return null;
  const title = typeof label === "string" && label ? (formatTitle?.(label) ?? label) : null;

  return (
    <div
      className={cn(
        "grid min-w-40 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs/relaxed",
        className,
      )}
    >
      {title ? <div className="font-medium">{title}</div> : null}
      {payload.map((item) => {
        const key = String(item.dataKey ?? item.name);
        const color = item.payload?.fill ?? item.color;
        return (
          <div key={key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: color }}
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">
              {labels?.[key] ?? item.name}
            </span>
            <span className="font-mono font-medium tabular-nums">
              {formatValue(Number(item.value), key)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
