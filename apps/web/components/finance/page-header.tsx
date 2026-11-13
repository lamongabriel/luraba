"use client";

import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import type * as React from "react";
import { KpiInline, type KpiInlineItem, KpiInlineSkeleton } from "@/components/kpi/kpi-inline";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type PageBackLink = {
  href: string;
  /** Where it goes, e.g. "Credit cards" renders "Back to Credit cards". */
  label: string;
};

/**
 * The title block every page of the app uses (ported from Nexus's `PageHeader` + `HeaderTools`): optional back link,
 * a title, a mandatory subtitle, and the header tools on the SAME row at every width, aligned with the title and
 * right-aligned: optional inline counters (`kpis`), then one action group (`controls`, then `actions`).
 *
 * - `controls`: what picks the data shown (`MonthSelect`). First in the group.
 * - `actions`: `HeaderAddButton` (primary, last) and `HeaderButton`s. Same height as the controls; on a phone every
 *   one of them is a small circle with an icon.
 * - `kpis`: one or two `KpiInlineItem`s to the left of the group on desktop (a divider between), in their own row
 *   under the title on a phone. Never tiles below the title.
 */
export function PageHeader({
  title,
  subtitle,
  controls,
  actions,
  kpis,
  kpisLoading = false,
  kpiLabels,
  mobileActions,
  back,
  compact = false,
  leading,
  className,
}: {
  title: string;
  subtitle: React.ReactNode;
  controls?: React.ReactNode;
  actions?: React.ReactNode;
  kpis?: KpiInlineItem[];
  /** Skeleton counters in place while their numbers load (pass the labels in `kpiLabels`). */
  kpisLoading?: boolean;
  kpiLabels?: string[];
  /**
   * Legacy (Transactions): phone-only circular actions in place of `actions`, which are then hidden below `md`.
   * New pages do not use it: `HeaderAddButton` and `HeaderButton` already collapse to circles on a phone.
   */
  mobileActions?: React.ReactNode;
  back?: PageBackLink;
  /** A smaller title and subtitle, for pages that sit inside another page's menu. */
  compact?: boolean;
  /** A picture or icon before the title (the household picture). */
  leading?: React.ReactNode;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const hasKpis = Boolean(kpis?.length) || (kpisLoading && Boolean(kpiLabels?.length));
  const counters = kpis?.length ? (
    <KpiInline items={kpis} size={isMobile ? "sm" : "md"} />
  ) : kpiLabels ? (
    <KpiInlineSkeleton labels={kpiLabels} size={isMobile ? "sm" : "md"} />
  ) : null;
  const hasGroup = Boolean(controls || actions);

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
      <div data-slot="page-header-row" className="flex items-center justify-between gap-3 md:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
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
        {hasKpis || hasGroup || mobileActions ? (
          <div
            data-slot="header-tools"
            className="flex shrink-0 items-center justify-end gap-3 md:gap-5"
          >
            {hasKpis && !isMobile ? counters : null}
            {hasGroup ? (
              <div
                data-slot="header-actions"
                className={cn(
                  "flex items-center justify-end gap-2",
                  mobileActions && "max-md:hidden",
                )}
              >
                {controls}
                {actions}
              </div>
            ) : null}
            {mobileActions ? (
              <div className="flex shrink-0 items-center gap-2 md:hidden">{mobileActions}</div>
            ) : null}
          </div>
        ) : null}
      </div>
      {hasKpis && isMobile ? <div data-slot="header-kpis-mobile">{counters}</div> : null}
    </header>
  );
}

/**
 * A small circular icon button for a phone header (`PageHeader mobileActions`, legacy): add, filter. `primary` is
 * the filled main action; `badge` is a count dot (active filters). The label is the accessible name.
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
