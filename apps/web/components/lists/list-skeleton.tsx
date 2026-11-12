import { LIST_ROW_HEIGHT_CLASS } from "@/components/lists/list-row";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Loading twin of `ListRow`: same height, mark, two text lines and trailing column. */
export function ListRowSkeleton() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex w-full items-center gap-3 border-b border-border/60 px-1 last:border-b-0",
        LIST_ROW_HEIGHT_CLASS,
      )}
    >
      <Skeleton className="size-8 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}

/** Loading twin of `ListGroupHeader`. */
export function ListGroupHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="flex h-8 items-end pb-1">
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

/** Loading twin of `MobileList`: a group header (when the list groups) and `rows` rows. */
export function ListSkeleton({
  rows = 10,
  grouped = false,
  className,
}: {
  rows?: number;
  grouped?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      {grouped ? <ListGroupHeaderSkeleton /> : null}
      {Array.from({ length: rows }, (_, row) => `row-${row}`).map((key) => (
        <ListRowSkeleton key={key} />
      ))}
    </div>
  );
}
