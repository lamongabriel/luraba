import {
  BUDGET_ALLOCATION_HEIGHT,
  BUDGET_CARD_HEIGHT,
  BUDGET_GRID,
  BUDGET_SKELETON_COUNT,
} from "@/components/budgets/budget-layout";
import { DonutChartCard } from "@/components/charts";
import { CardSkeleton, LoadingRegion } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SKELETON_KEYS = Array.from(
  { length: BUDGET_SKELETON_COUNT },
  (_, index) => `budget-${index}`,
);

/** Mirrors `BudgetsContent`: the split chart, then the grid of budget cards. */
export function BudgetsLoading() {
  return (
    <div className="space-y-8">
      <DonutChartCard
        flat
        title="Budget split"
        status="loading"
        data={[]}
        currencyCode="USD"
        heightClassName={BUDGET_ALLOCATION_HEIGHT}
        className="mx-auto max-w-2xl"
      />
      <LoadingRegion label="Loading budgets" className={BUDGET_GRID}>
        {SKELETON_KEYS.map((key) => (
          <CardSkeleton
            key={key}
            className={cn("flex flex-col justify-between", BUDGET_CARD_HEIGHT)}
          >
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-7 w-44" />
            <div className="space-y-1.5">
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardSkeleton>
        ))}
      </LoadingRegion>
    </div>
  );
}
