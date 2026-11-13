import type * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type KpiInlineItem = {
  label: string;
  value: React.ReactNode;
  /** Extra classes for the value (a tone, a max width). */
  valueClassName?: string;
};

/** Height of one inline counter (label line + value line); the skeleton and the loaded row share it. */
export const KPI_INLINE_HEIGHT_CLASS = "h-9";

/**
 * One to three compact counters on a row: a muted label over a semibold value, no card, no border. Ported from
 * Nexus's `KpiInline`; it lives in the page header (`PageHeader` `kpis`) next to the actions, never as tiles under
 * the title. A thin divider separates the counters. `size="sm"` is the phone arrangement under the title.
 */
export function KpiInline({
  items,
  size = "md",
  className,
}: {
  items: KpiInlineItem[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <dl
      data-slot="kpi-inline"
      className={cn("flex flex-wrap items-center gap-x-6 gap-y-2", className)}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "flex min-w-0 flex-col justify-center gap-0.5",
            KPI_INLINE_HEIGHT_CLASS,
            index > 0 && "border-l pl-6 max-md:pl-4",
          )}
        >
          <dt
            className={cn(
              "whitespace-nowrap text-muted-foreground",
              size === "sm" ? "text-[0.6875rem]" : "text-xs",
            )}
          >
            {item.label}
          </dt>
          <dd
            className={cn(
              "flex min-w-0 items-center whitespace-nowrap font-semibold tabular-nums text-foreground",
              size === "sm" ? "text-xs" : "text-sm",
              item.valueClassName,
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The loading twin of `KpiInline`: the same labels with a skeleton value, so nothing moves when numbers arrive. */
export function KpiInlineSkeleton({
  labels,
  size = "md",
  className,
}: {
  labels: string[];
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <KpiInline
      size={size}
      className={className}
      items={labels.map((label) => ({ label, value: <Skeleton className="h-4 w-20" /> }))}
    />
  );
}
