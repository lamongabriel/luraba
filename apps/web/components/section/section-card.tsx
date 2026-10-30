import type * as React from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

/**
 * One section of a section page (Settings, Household): a card whose title, description and
 * actions live inside it, with the content below a divider. Every card in these areas is a
 * `SectionCard`; change it here and they all follow.
 */
export function SectionCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
  contentClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned in the header (buttons, a menu). */
  actions?: React.ReactNode;
  /** Below the content, behind a divider; typically the Save button. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  const hasHeader = Boolean(title || description || actions);
  return (
    <Card className={className}>
      {hasHeader ? (
        <>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {title ? <CardTitle>{title}</CardTitle> : null}
              {description ? <CardDescription>{description}</CardDescription> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
          </CardHeader>
          <Separator />
        </>
      ) : null}
      <CardContent className={cn("min-w-0", contentClassName)}>{children}</CardContent>
      {footer ? (
        <>
          <Separator />
          <div className="flex items-center justify-end gap-2 px-(--card-spacing)">{footer}</div>
        </>
      ) : null}
    </Card>
  );
}

/** A hairline between blocks inside a `SectionCard`. */
export function SectionDivider({ className }: { className?: string }) {
  return <Separator className={cn("my-4", className)} />;
}

/** A titled group inside a card, e.g. "Preferences" above a `SectionFields` grid. */
export function SectionBlock({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-0.5">
        <Typography as="h3" variant="small-strong">
          {title}
        </Typography>
        {description ? <Typography variant="small-muted">{description}</Typography> : null}
      </div>
      {children}
    </div>
  );
}

/** A responsive grid for read-only facts (`InfoItem`) or form fields inside a card. */
export function SectionFields({
  children,
  columns = 3,
  className,
}: {
  children: React.ReactNode;
  columns?: 2 | 3;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-x-6 gap-y-5 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** A label and help text on the left, its control on the right; rows divide themselves. */
export function SectionRow({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between [&:not(:first-child)]:border-t",
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <Typography variant="small-strong">{title}</Typography>
        {description ? <Typography variant="small-muted">{description}</Typography> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}
