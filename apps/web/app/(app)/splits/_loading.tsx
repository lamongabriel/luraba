import { EntityCardGridSkeleton } from "@/components/states";

export function SplitsLoading() {
  return <EntityCardGridSkeleton count={4} label="Loading splits" />;
}
