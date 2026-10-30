import { Skeleton } from "@/components/ui/skeleton";

import { CardSkeleton, LoadingRegion } from "./skeletons";

/**
 * Loading twin of the progress cards on Goals, Bills and Splits (name, subtitle, member, status
 * badge, progress bar, footer line) in the same two-column grid. Same padding, rows and bar.
 */
export function EntityCardGridSkeleton({
  count = 4,
  label = "Loading",
}: {
  count?: number;
  label?: string;
}) {
  return (
    <LoadingRegion label={label} className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: count }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <CardSkeleton key={index}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
          <div className="mt-2 flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardSkeleton>
      ))}
    </LoadingRegion>
  );
}
