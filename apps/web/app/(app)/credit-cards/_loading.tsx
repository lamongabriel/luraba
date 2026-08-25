import { Skeleton } from "@/components/ui/skeleton"

export default function CreditCardsLoadingPage() {
  return (
    <div
      className="space-y-4"
      aria-busy="true"
      aria-label="Loading credit cards"
      role="status"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-72" />
      <Skeleton className="h-32" />
    </div>
  )
}
