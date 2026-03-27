import * as React from "react";

import { cn } from "@/lib/utils";

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
        "rounded-[1.35rem] border border-border/70 bg-[var(--color-container)] shadow-[0_16px_45px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h2 className="font-heading text-xl text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="flex items-center gap-2">{action}</div> : null}
      </div>
      <div className={cn("px-5 py-5", contentClassName)}>{children}</div>
    </section>
  );
}
