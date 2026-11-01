import { PanelCard } from "@/components/finance/panel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Building blocks for a page's `_loading.tsx`. They only give names to common shapes; the page's
 * loading file still has to mirror its loaded layout one to one (same grid, heights and spacing).
 */

/** A bordered card-shaped block (`rounded-xl border p-4`, the shape of list and grid cards). */
export function CardSkeleton({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div aria-hidden="true" className={cn("rounded-xl border border-border/60 p-4", className)}>
      {children}
    </div>
  );
}

/** One line of text at the height of `text-sm` (`h-5`) or `text-xs` (`h-4`). */
export function TextSkeleton({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "xs" | "sm" | "lg";
}) {
  const height = size === "xs" ? "h-4" : size === "lg" ? "h-7" : "h-5";
  return <Skeleton className={cn(height, "w-32", className)} />;
}

/** Wraps a skeleton so assistive tech announces loading once. */
export function LoadingRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}

/**
 * Loading twin of a `PanelCard` (`components/finance/panel-card.tsx`): the same card, header
 * (icon tile, title) and fill behaviour, with a skeleton body, so the panel keeps its height.
 */
export function PanelCardSkeleton({
  label,
  withIcon = true,
  fill = true,
  lines = 4,
}: {
  label: string;
  withIcon?: boolean;
  fill?: boolean;
  lines?: number;
}) {
  return (
    <PanelCard
      fill={fill}
      title={<Skeleton className="h-5 w-36" />}
      icon={withIcon ? <Skeleton className="size-6 rounded-md" /> : undefined}
      iconFrame={false}
    >
      <div role="status" aria-busy="true" aria-label={label} className="flex-1 space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </PanelCard>
  );
}
