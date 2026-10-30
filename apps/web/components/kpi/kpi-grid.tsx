import type * as React from "react";

import { cn } from "@/lib/utils";

import { KpiCardSkeleton } from "./kpi-card";

/** Responsive columns by how many KPIs the row has. Add a count here, never a page-local grid. */
const KPI_GRID_COLUMNS = {
  2: "sm:grid-cols-2",
  3: "md:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
} as const;

export type KpiGridColumns = keyof typeof KPI_GRID_COLUMNS;

/** The one row of `KpiCard`s every page uses. */
export function KpiGrid({
  columns = 3,
  className,
  children,
}: {
  columns?: KpiGridColumns;
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("grid gap-3", KPI_GRID_COLUMNS[columns], className)}>{children}</div>;
}

/** Loading twin of a `KpiGrid` with the same number of columns and cards. */
export function KpiGridSkeleton({
  columns = 3,
  count = columns,
  withDescription = false,
  label = "Loading metrics",
}: {
  columns?: KpiGridColumns;
  count?: number;
  withDescription?: boolean;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <KpiGrid columns={columns}>
        {Array.from({ length: count }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <KpiCardSkeleton key={index} withDescription={withDescription} />
        ))}
      </KpiGrid>
    </div>
  );
}
