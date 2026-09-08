import type * as React from "react";

import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export function SidePanelEntityRow({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 border-t border-border/60 py-2.5 first:border-t-0",
        className,
      )}
    >
      <Typography variant="small-muted" className="w-16 shrink-0">
        {label}
      </Typography>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
