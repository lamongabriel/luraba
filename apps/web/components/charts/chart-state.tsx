import type { ReactNode } from "react";

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import type { ChartStatus } from "./types";

interface ChartStateProps {
  title: string;
  status: ChartStatus;
  errorMessage?: string;
  isEmpty: boolean;
  children: ReactNode;
  className?: string;
}

export function ChartState({
  title,
  status,
  errorMessage,
  isEmpty,
  children,
  className,
}: ChartStateProps) {
  return (
    <section aria-label={title} className={cn("min-w-0", className)}>
      {getChartContent({ children, status, isEmpty, errorMessage })}
    </section>
  );
}

function getChartContent({
  children,
  status,
  isEmpty,
  errorMessage,
}: {
  children: ReactNode;
  status: ChartStatus;
  isEmpty: boolean;
  errorMessage?: string;
}) {
  if (status === "loading") {
    return <Skeleton className="h-64 w-full rounded-md" aria-label="Loading chart" />;
  }

  if (status === "error") {
    return (
      <p className="flex h-64 items-center justify-center rounded-md border border-dashed border-destructive/40 px-6 text-center text-xs/relaxed text-muted-foreground">
        {errorMessage ?? "This chart could not be loaded."}
      </p>
    );
  }

  if (isEmpty) {
    return (
      <Empty className="min-h-64 border-border py-6">
        <EmptyHeader>
          <EmptyTitle>No chart data</EmptyTitle>
          <EmptyDescription>No data is available for this period.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return children;
}
