import {
  GOAL_CARD_HEIGHT,
  GOAL_SKELETON_KEYS,
  GOALS_GRID,
  GOALS_TOTAL_HEIGHT,
} from "@/components/goals/goal-layout";
import { CardSkeleton, LoadingRegion } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** The "Total saved" line as a skeleton; the page uses it while the goals and rates load. */
export function GoalsTotalSkeleton() {
  return (
    <div className={cn("flex flex-col justify-center gap-1", GOALS_TOTAL_HEIGHT)}>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-6 w-36" />
    </div>
  );
}

/** Mirrors the loaded page: the total line, then the grid of goal cards. */
export function GoalsLoading() {
  return (
    <div className="space-y-4">
      <GoalsTotalSkeleton />
      <LoadingRegion label="Loading goals" className={GOALS_GRID}>
        {GOAL_SKELETON_KEYS.map((key) => (
          <CardSkeleton key={key} className={cn("flex flex-col justify-between", GOAL_CARD_HEIGHT)}>
            <div className="flex items-center gap-3">
              <Skeleton className="size-11 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-44" />
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
