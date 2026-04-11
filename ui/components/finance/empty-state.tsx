import * as React from "react";

import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-6 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      <Typography as="h3" variant="section-title">
        {title}
      </Typography>
      <Typography variant="body-muted" className="mt-2 max-w-md">
        {description}
      </Typography>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
