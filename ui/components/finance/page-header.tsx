import * as React from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-[1.5rem] border border-border/70 bg-[var(--color-container)] px-5 py-5 shadow-[0_12px_40px_rgba(15,23,42,0.04)] md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Personal finance
        </p>
        <h1 className="font-heading text-3xl text-foreground md:text-4xl">{title}</h1>
        {description ? <p className="max-w-2xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </section>
  );
}
