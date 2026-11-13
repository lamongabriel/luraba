import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { KPI_TONE_CLASSES, type KpiTone } from "./kpi-card";

export interface KpiMobileSummaryItem {
  label: string;
  value: ReactNode;
  tone?: KpiTone;
  /** A short muted note after the value, e.g. "+12% vs previous period". */
  hint?: ReactNode;
}

/** The block's shape on a phone: a title row, a hairline, then one short row per figure. */
const BLOCK = "md:hidden";
const ROW = "flex min-h-9 items-center justify-between gap-3";

/**
 * The phone version of a `KpiGrid`: below `md` the cards are too big for a few numbers, so they collapse into one
 * compact block (title, divider, text rows). It renders nothing from `md` up; pair it with a `KpiGrid` wrapped in
 * `max-md:hidden`. `action` sits at the right of the title row (the page's date filter).
 */
export function KpiMobileSummary({
  title,
  action,
  items,
  className,
}: {
  title: string;
  action?: ReactNode;
  items: KpiMobileSummaryItem[];
  className?: string;
}) {
  return (
    <section aria-label={title} className={cn(BLOCK, className)}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <dl className="mt-1 divide-y divide-border/60 border-t border-border/60">
        {items.map((item) => (
          <div key={item.label} className={ROW}>
            <dt className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full bg-current",
                  KPI_TONE_CLASSES[item.tone ?? "neutral"].line,
                )}
              />
              {item.label}
            </dt>
            <dd className="m-0 flex min-w-0 items-baseline gap-2 text-sm font-bold tabular-nums">
              {item.hint ? (
                <span className="truncate text-xs font-normal text-muted-foreground">
                  {item.hint}
                </span>
              ) : null}
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Loading twin of `KpiMobileSummary`: the same title row, hairline and rows. */
export function KpiMobileSummarySkeleton({
  count = 3,
  action,
  label = "Loading summary",
  className,
}: {
  count?: number;
  /** The title row's right-hand control, when it is not data (the date filter chip renders itself). */
  action?: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={cn(BLOCK, className)}>
      <div className="flex min-h-9 items-center justify-between gap-3">
        <Skeleton className="h-4 w-24" />
        {action}
      </div>
      <div className="mt-1 divide-y divide-border/60 border-t border-border/60">
        {Array.from({ length: count }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <div key={index} className={ROW}>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
