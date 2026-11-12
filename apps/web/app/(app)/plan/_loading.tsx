import { LeftToSpendSkeleton } from "@/components/plan/left-to-spend";

/** The "left to spend" section while it loads; mirrors `LeftToSpend` (one currency block). */
export function PlanLoading() {
  return <LeftToSpendSkeleton />;
}
