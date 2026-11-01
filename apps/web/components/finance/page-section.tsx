import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A titled section of a page: a heading row (title, optional description and actions) over its
 * content, no card around it. Sections are separated by spacing and, with `divider`, a hairline
 * above. Use it to build a page as a flow; reach for `PanelCard` only where a bordered panel
 * really helps.
 */
export function PageSection({
  title,
  description,
  actions,
  divider = false,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** A hairline above the section, for sections that follow other content. */
  divider?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("min-w-0 space-y-3", divider && "border-t border-border/60 pt-5", className)}
    >
      <div className="flex min-h-7 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          {description ? (
            <div className="truncate text-xs text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? <div className="shrink-0 text-sm">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
