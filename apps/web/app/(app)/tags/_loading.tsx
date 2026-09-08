import { Skeleton } from "@/components/ui/skeleton";

const LOADING_ROW_KEYS = ["a", "b", "c", "d", "e"] as const;

export function TagsLoading() {
  return (
    <div className="space-y-1">
      {LOADING_ROW_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-2 py-1.5 pl-1">
          <Skeleton className="size-5 rounded-md bg-muted/60" />
          <Skeleton className="h-3.5 w-40 bg-muted/50" />
        </div>
      ))}
    </div>
  );
}
