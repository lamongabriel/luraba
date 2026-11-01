import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

const STRIP_COLUMNS = {
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 lg:grid-cols-5",
} as const;

/** With a `lead` cell: it is wider than the figures (`lg`), full width above them on small screens. */
const LEAD_COLUMNS = {
  3: "grid-cols-2 lg:grid-cols-[minmax(15rem,1.6fr)_repeat(3,minmax(0,1fr))]",
  4: "grid-cols-2 lg:grid-cols-[minmax(15rem,1.6fr)_repeat(4,minmax(0,1fr))]",
} as const;
const LEAD_STRIP = "max-lg:gap-x-4 max-lg:divide-x-0 max-lg:[&>*]:px-0";
const LEAD_CELL = "col-span-2 min-w-0 px-4 py-3 first:pl-0 lg:col-span-1";

export type KpiStripColumns = keyof typeof STRIP_COLUMNS;

export interface KpiStripItem {
  label: string;
  value: ReactNode;
  /** A muted line under the value: the change against the previous period, or what it counts. */
  hint?: ReactNode;
}

const CELL = "min-w-0 space-y-1 px-4 py-3 first:pl-0";

/**
 * A slim row of headline numbers that sits directly on the page, separated by hairlines: no cards.
 * Use it under a hero number when the figures support the story; use `KpiGrid` when each number
 * deserves a card of its own.
 */
export function KpiStrip({
  items,
  lead,
  className,
  label = "Key figures",
}: {
  items: KpiStripItem[];
  /** A wider first cell (a ring with the headline figure) before the figures; 3 or 4 items. */
  lead?: ReactNode;
  className?: string;
  label?: string;
}) {
  const columns = Math.min(Math.max(items.length, 3), 5) as KpiStripColumns;
  const grid = lead
    ? [LEAD_COLUMNS[Math.min(Math.max(items.length, 3), 4) as 3 | 4], LEAD_STRIP]
    : STRIP_COLUMNS[columns];
  return (
    <dl
      aria-label={label}
      className={cn("grid divide-x divide-border/60 border-y border-border/60", grid, className)}
    >
      {lead ? <div className={LEAD_CELL}>{lead}</div> : null}
      {items.map((item) => (
        <div key={item.label} className={CELL}>
          <Typography as="dt" variant="small-muted" className="truncate">
            {item.label}
          </Typography>
          <dd className="m-0 truncate text-lg font-semibold tracking-tight">{item.value}</dd>
          {item.hint ? (
            <div className="truncate text-xs text-muted-foreground">{item.hint}</div>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/** Loading twin of `KpiStrip`: the same hairlines, cells and row heights. */
export function KpiStripSkeleton({
  count,
  lead,
  className,
  label = "Loading key figures",
}: {
  count: number;
  /** The loading twin of the strip's `lead` cell; renders in the same wide first cell. */
  lead?: ReactNode;
  className?: string;
  label?: string;
}) {
  const columns = Math.min(Math.max(count, 3), 5) as KpiStripColumns;
  const grid = lead
    ? [LEAD_COLUMNS[Math.min(Math.max(count, 3), 4) as 3 | 4], LEAD_STRIP]
    : STRIP_COLUMNS[columns];
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn("grid divide-x divide-border/60 border-y border-border/60", grid, className)}
    >
      {lead ? <div className={LEAD_CELL}>{lead}</div> : null}
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <div key={index} className={CELL}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
