import { Skeleton } from "@/components/ui/skeleton";

export function InvestmentSettingsLoading() {
  return <Skeleton role="status" aria-label="Loading settings" className="h-48 rounded-xl" />;
}

export function PriceProvidersLoading() {
  return <Skeleton role="status" aria-label="Loading providers" className="h-40 rounded-xl" />;
}
