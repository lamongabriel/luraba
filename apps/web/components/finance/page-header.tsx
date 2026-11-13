import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

export type PageBackLink = {
  href: string;
  /** Where it goes, e.g. "Credit cards" renders "Back to Credit cards". */
  label: string;
};

/**
 * The title block every page of the app uses: optional back link, a title, a mandatory subtitle,
 * and a right-hand slot (aligned with the title) for actions.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  mobileActions,
  back,
  compact = false,
  leading,
  inlineActions = false,
  className,
}: {
  title: string;
  subtitle: React.ReactNode;
  actions?: React.ReactNode;
  /**
   * Phone-only actions: small circular icon buttons (`PageHeaderIconButton`) at the right of the title row, in place
   * of `actions` (which are then hidden below `md`). Without it, `actions` show on every width as before.
   */
  mobileActions?: React.ReactNode;
  back?: PageBackLink;
  /** A smaller title and subtitle, for pages that sit inside another page's menu. */
  compact?: boolean;
  /** A picture or icon before the title (the household picture). */
  leading?: React.ReactNode;
  /** Keep the actions on the title's row on a phone (one small icon button), instead of below it. */
  inlineActions?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("space-y-2", className)}>
      {back ? (
        <Button asChild variant="link" className="-ml-2 h-6 px-2">
          <Link href={back.href}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
            Back to {back.label}
          </Link>
        </Button>
      ) : null}
      <div
        className={cn(
          "flex gap-4 md:flex-row md:items-center md:justify-between",
          mobileActions
            ? "flex-row items-start"
            : inlineActions
              ? "items-center justify-between"
              : "flex-col",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="min-w-0">
            <Typography
              as="h1"
              variant={compact ? "section-title" : "page-title"}
              className="max-w-3xl"
            >
              {title}
            </Typography>
            <Typography variant={compact ? "small-muted" : "body-muted"} className="mt-1 max-w-3xl">
              {subtitle}
            </Typography>
          </div>
        </div>
        {actions ? (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              mobileActions && "max-md:hidden",
              inlineActions && "shrink-0",
            )}
          >
            {actions}
          </div>
        ) : null}
        {mobileActions ? (
          <div className="flex shrink-0 items-center gap-2 md:hidden">{mobileActions}</div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * A small circular icon button for a phone header (`PageHeader mobileActions`): add, filter. `primary` is the
 * filled main action; `badge` is a count dot (active filters). The label is the accessible name.
 */
export function PageHeaderIconButton({
  label,
  icon,
  onClick,
  primary = false,
  badge,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  badge?: number;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant={primary ? "default" : "outline"}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn("relative size-9 rounded-full", !primary && "bg-card dark:bg-input/30")}
    >
      {icon}
      {badge ? (
        <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[0.6rem] font-semibold text-primary-foreground ring-2 ring-background">
          {badge}
        </span>
      ) : null}
    </Button>
  );
}
