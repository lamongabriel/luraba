import type * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * A titled card for insight panels (expense breakdown, upcoming transactions, ...). Every panel
 * uses it so headers are identical: title, an optional icon beside it, an optional description and
 * optional actions on the right. `fill` makes the card stretch to the height of its grid row and
 * the body take the leftover space, so empty states can center in it.
 */
export function PanelCard({
  title,
  icon,
  description,
  actions,
  fill = false,
  iconFrame = true,
  className,
  contentClassName,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  fill?: boolean;
  /** Draws the bordered tile around `icon`. Off for the loading twin, which brings its own. */
  iconFrame?: boolean;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(fill && "min-h-0 flex-1", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2">
            {icon ? (
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-3.5",
                  iconFrame && "rounded-md border border-border/70",
                )}
              >
                {icon}
              </span>
            ) : null}
            <span className="truncate">{title}</span>
          </CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </CardHeader>
      <CardContent className={cn(fill && "flex min-h-0 flex-1 flex-col", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}
