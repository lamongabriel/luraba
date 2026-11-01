import type { ReactNode } from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/**
 * A compact label-over-value cell for a row of small facts inside another card (days left, daily
 * allowance, projected spend). Use `KpiCard` for a headline number of its own.
 */
export function KpiStat({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 rounded-lg bg-muted/40 px-3 py-2", className)}>
      <Typography variant="small-muted" className="truncate">
        {label}
      </Typography>
      <div className="truncate text-sm font-medium">{children}</div>
    </div>
  );
}
