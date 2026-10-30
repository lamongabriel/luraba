import { Skeleton } from "@/components/ui/skeleton";

const KEYS = ["a", "b", "c"] as const;

export function InvestmentAccountsLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading accounts"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {KEYS.map((key) => (
        <Skeleton key={key} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
