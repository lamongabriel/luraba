import { ChartCard } from "@/components/charts";
import { KpiStripSkeleton } from "@/components/kpi";
import { PanelCardSkeleton, TableSkeleton } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import {
  ACCOUNT_MAIN_COLUMN,
  ACCOUNT_PAGE_GRID,
  ACCOUNT_RECENT_TRANSACTIONS,
  ACCOUNT_SIDE_COLUMN,
  ACCOUNT_STAT_COUNT,
  ACCOUNT_TOP_MERCHANTS,
  ACCOUNT_UPCOMING_ROWS,
} from "./account-detail-layout";
import { AccountOverviewSkeleton } from "./account-overview";
import { ACCOUNT_TRANSACTION_COLUMN_COUNT } from "./account-recent-transactions";

/** The header's right side while loading: the period button and the Edit button. */
export function AccountHeaderActionsSkeleton() {
  return (
    <>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-7 w-16" />
    </>
  );
}

/** The header's mark while loading (`AccountMark size="lg"`). */
export function AccountHeaderMarkSkeleton() {
  return <Skeleton className="size-11 rounded-xl" />;
}

/**
 * The page body while the account itself loads, in the loaded page's grid: balance and chart, key
 * figures, recent transactions and the chart pair on the left; upcoming charges and details on the
 * right (the credit cards and loan outlook cards only exist for some accounts).
 */
export function AccountDetailSkeleton() {
  return (
    <div className={ACCOUNT_PAGE_GRID}>
      <div className={ACCOUNT_MAIN_COLUMN}>
        <AccountOverviewSkeleton />
        <KpiStripSkeleton count={ACCOUNT_STAT_COUNT} />
        <ChartCard title="Cash flow" status="loading">
          {null}
        </ChartCard>
        <section aria-hidden="true" className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <Typography as="h2" variant="section-title">
                Recent transactions
              </Typography>
              <Typography variant="small-muted">Latest activity in this period</Typography>
            </div>
            <Skeleton className="h-7 w-20" />
          </div>
          <TableSkeleton
            columns={ACCOUNT_TRANSACTION_COLUMN_COUNT}
            rows={ACCOUNT_RECENT_TRANSACTIONS}
            label="Loading recent transactions"
            mobileList={{ grouped: true }}
          />
        </section>
      </div>
      <aside className={ACCOUNT_SIDE_COLUMN}>
        <ChartCard title="Expenses by category" status="loading">
          {null}
        </ChartCard>
        <PanelCardSkeleton
          fill={false}
          label="Loading top merchants"
          lines={ACCOUNT_TOP_MERCHANTS}
        />
        <PanelCardSkeleton label="Loading upcoming charges" lines={ACCOUNT_UPCOMING_ROWS} />
      </aside>
    </div>
  );
}
