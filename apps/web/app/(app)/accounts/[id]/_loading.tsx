import { InternalPageLayout } from "@/components/finance/internal-page-layout"
import { Skeleton } from "@/components/ui/skeleton"

export function AccountDetailsLoading() {
  return (
    <InternalPageLayout title="Account">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-[1.5rem]" />
          <Skeleton className="h-72 rounded-[1.5rem]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-72 rounded-[1.5rem]" />
          <Skeleton className="h-36 rounded-[1.5rem]" />
        </div>
      </div>
    </InternalPageLayout>
  )
}
