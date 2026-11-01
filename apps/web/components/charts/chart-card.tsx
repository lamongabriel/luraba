"use client";

import type * as React from "react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PanelCard } from "@/components/finance/panel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { CHART_HEIGHT_CLASS } from "./chart-theme";
import type { ChartStatus } from "./types";

export interface ChartCardProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Buttons or links in the card header (a "See all" link, a toggle). */
  actions?: React.ReactNode;
  /** `loading` shows the skeleton, `error` the retryable error, `ready` the chart (or empty state). */
  status?: ChartStatus;
  /** Ready but nothing to plot. */
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  errorMessage?: string;
  onRetry?: () => void;
  /** Overrides the plot height; the skeleton, error and empty states use the same one. */
  heightClassName?: string;
  /** Drops the card (border, header) and renders only the body, for a chart that sits on the page. */
  flat?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * The shell every chart renders inside: a `PanelCard` (shared card header) with a body that is the
 * chart, a skeleton, the shared `ErrorState` with a retry, or the shared `EmptyState`. All four
 * bodies are the same height, so switching state never moves the page.
 */
export function ChartCard({
  title,
  description,
  icon,
  actions,
  status = "ready",
  isEmpty = false,
  emptyTitle = "Nothing to chart yet",
  emptyDescription = "There is no data for this period.",
  errorMessage,
  onRetry,
  heightClassName = CHART_HEIGHT_CLASS,
  flat = false,
  className,
  children,
}: ChartCardProps) {
  const body = (
    <section aria-label={title} className={cn("min-w-0", heightClassName, flat && className)}>
      {status === "loading" ? (
        <div role="status" aria-busy="true" aria-label={`Loading ${title}`} className="h-full">
          <Skeleton className="h-full w-full" />
        </div>
      ) : status === "error" ? (
        <div className="flex h-full items-center">
          <ErrorState
            className="w-full"
            title={`Couldn't load ${title.toLowerCase()}`}
            description={errorMessage ?? "Try again to load this chart."}
            onRetry={onRetry}
          />
        </div>
      ) : isEmpty ? (
        <EmptyState
          variant="embedded"
          className="h-full py-0"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        children
      )}
    </section>
  );

  if (flat) return body;
  return (
    <PanelCard
      title={title}
      description={description}
      icon={icon}
      actions={status === "ready" ? actions : undefined}
      className={className}
    >
      {body}
    </PanelCard>
  );
}
