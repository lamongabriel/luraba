import {
  BILL_GROUP_HEADER_HEIGHT,
  BILL_ROW_HEIGHT,
  BILLS_SUMMARY_HEIGHT,
} from "@/components/bills/bill-layout";
import { LoadingRegion } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const GROUP_ROWS = ["a", "b", "c", "d"];

/** The month summary as a skeleton. */
export function BillsSummarySkeleton() {
  return (
    <div className={cn("flex flex-col justify-center gap-2", BILLS_SUMMARY_HEIGHT)}>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

/** Mirrors the loaded page: the summary bar, then a group of bill rows. */
export function BillsLoading() {
  return (
    <LoadingRegion label="Loading bills" className="space-y-4">
      <BillsSummarySkeleton />
      <section>
        <div className={cn("flex items-center", BILL_GROUP_HEADER_HEIGHT)}>
          <Skeleton className="h-4 w-24" />
        </div>
        {GROUP_ROWS.map((key) => (
          <div
            key={key}
            className={cn("flex items-center gap-3 border-b border-border/60", BILL_ROW_HEIGHT)}
          >
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </section>
    </LoadingRegion>
  );
}
