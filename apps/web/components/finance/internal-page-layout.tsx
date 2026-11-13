"use client";

import type * as React from "react";

import { MemberDisplay } from "@/components/display";
import { type PageBackLink, PageHeader } from "@/components/finance/page-header";
import type { KpiInlineItem } from "@/components/kpi/kpi-inline";
import { PageReveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function InternalPageLayout({
  title,
  subtitle,
  back,
  controls,
  actions,
  kpis,
  kpisLoading,
  kpiLabels,
  mobileActions,
  compact,
  leading,
  createdBy,
  children,
  className,
}: {
  title: string;
  subtitle: React.ReactNode;
  back?: PageBackLink;
  /** What picks the data shown (`MonthSelect`); first in the header's action group. See `PageHeader`. */
  controls?: React.ReactNode;
  /** `HeaderAddButton` / `HeaderButton`s; see `PageHeader`. */
  actions?: React.ReactNode;
  /** Inline counters in the header, right-aligned with the title; see `PageHeader`. */
  kpis?: KpiInlineItem[];
  kpisLoading?: boolean;
  kpiLabels?: string[];
  /** Legacy phone-only circular icon actions (Transactions); see `PageHeader`. */
  mobileActions?: React.ReactNode;
  /** Smaller title block, for pages inside a section menu (Household). */
  compact?: boolean;
  leading?: React.ReactNode;
  /** A record's `createdByUserId`; when given (even null) the page shows who created it. */
  createdBy?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PageReveal className={cn("min-w-0 max-w-full space-y-5", className)}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        back={back}
        controls={controls}
        actions={actions}
        kpis={kpis}
        kpisLoading={kpisLoading}
        kpiLabels={kpiLabels}
        mobileActions={mobileActions}
        compact={compact}
        leading={leading}
      />
      {createdBy !== undefined ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Created by <MemberDisplay userId={createdBy} size="xs" />
        </div>
      ) : null}
      {children}
    </PageReveal>
  );
}
