import { Skeleton } from "@/components/ui/skeleton";

export function CreditCardsLoading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading credit cards" className="space-y-5">
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
