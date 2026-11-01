import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { ACCOUNT_ROW_CLASS } from "@/lib/accounts";

const LOADING_ROW_KEYS = ["first", "second", "third"] as const;

function LoadingGroup({ title }: { title: string }) {
  return (
    <section className="space-y-4">
      <Typography as="h2" variant="eyebrow">
        {title}
      </Typography>

      <div className="space-y-3">
        {LOADING_ROW_KEYS.map((rowKey) => (
          <div key={`${title}-${rowKey}`} className={ACCOUNT_ROW_CLASS}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Skeleton className="size-11 rounded-xl bg-background/50" />
                <div className="min-w-0 space-y-1.5">
                  <Skeleton className="h-3.5 w-28 bg-background/50" />
                  <Skeleton className="h-3 w-44 bg-background/40" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="ml-auto h-2.5 w-12 bg-background/35" />
                <Skeleton className="ml-auto h-3.5 w-20 bg-background/50" />
              </div>
              <Skeleton className="size-4 rounded-full bg-background/35" />
            </div>
            <Skeleton className="size-7 rounded-lg bg-background/35" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function AccountsLoading() {
  return (
    <>
      <LoadingGroup title="Assets" />
      <LoadingGroup title="Liabilities" />
    </>
  );
}
