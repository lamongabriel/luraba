import * as React from "react";

import { cn } from "@/lib/utils";
import { Typography } from "@/components/ui/typography";

export function SectionPanel({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[1.45rem] border border-border/70 bg-[var(--color-container)] shadow-[0_24px_80px_rgba(0,0,0,0.32)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-primary/28 to-transparent" />
      <div className="flex flex-col gap-3 border-b border-dashed border-border/60 px-5 py-5 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Typography as="h2" variant="section-title">
            {title}
          </Typography>
          {description ? (
            <Typography variant="body-muted" className="max-w-2xl">
              {description}
            </Typography>
          ) : null}
        </div>
        {action ? <div className="flex items-center gap-2">{action}</div> : null}
      </div>
      <div className={cn("px-5 py-5 md:px-6 md:py-6", contentClassName)}>{children}</div>
    </section>
  );
}
