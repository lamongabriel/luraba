import { Skeleton } from "@/components/ui/skeleton"

const TYPE_GROUPS = ["Income", "Expense"] as const
const LOADING_ROW_KEYS = ["a", "b", "c"] as const

function LoadingGroup({ title }: { title: string }) {
  return (
    <section className="space-y-1">
      <Skeleton className="ml-1 h-3 w-20 bg-muted/60" />
      <div className="space-y-1">
        {LOADING_ROW_KEYS.map((rowKey) => (
          <div
            key={`${title}-${rowKey}`}
            className="flex items-center gap-2 py-1.5 pl-1"
          >
            <span className="size-4" />
            <Skeleton className="size-5 rounded-md bg-muted/60" />
            <Skeleton className="h-3.5 w-40 bg-muted/50" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function CategoriesLoading() {
  return (
    <div className="space-y-5">
      {TYPE_GROUPS.map((title) => (
        <LoadingGroup key={title} title={title} />
      ))}
    </div>
  )
}
