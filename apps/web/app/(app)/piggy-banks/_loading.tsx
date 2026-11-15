import {
  PIGGY_ACCOUNT_ROW_HEIGHT,
  PIGGY_BANK_CARD_HEIGHT,
  PIGGY_BANK_SKELETON_KEYS,
  PIGGY_BANKS_GRID,
} from "@/components/piggy-banks/piggy-bank-layout";
import { CardSkeleton, LoadingRegion } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Mirrors the loaded page: one account summary row, then the grid of piggy bank cards. */
export function PiggyBanksLoading() {
  return (
    <LoadingRegion label="Loading piggy banks" className="space-y-5">
      <div className={cn("flex items-center justify-between gap-3", PIGGY_ACCOUNT_ROW_HEIGHT)}>
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
      <div className={PIGGY_BANKS_GRID}>
        {PIGGY_BANK_SKELETON_KEYS.map((key) => (
          <CardSkeleton
            key={key}
            className={cn("flex flex-col justify-between", PIGGY_BANK_CARD_HEIGHT)}
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-40" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
          </CardSkeleton>
        ))}
      </div>
    </LoadingRegion>
  );
}
