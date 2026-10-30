import { EntityCardGridSkeleton } from "@/components/states";

export function GoalsLoading() {
  return <EntityCardGridSkeleton count={4} label="Loading goals" />;
}
