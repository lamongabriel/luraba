"use client";

import type { CreditCardInsights, CreditCardOverview } from "@luraba/contracts";
import { AmountDisplay, CategoryDisplay, CombinedAmountDisplay } from "@/components/display";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageSection } from "@/components/finance/page-section";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const TOP_CATEGORIES_COUNT = 4;
const ROW_CLASS = "flex h-8 items-center justify-between gap-3";
const TITLE = "Credit utilization";
const DESCRIPTION = "How much of your limit is in use";

/**
 * The limit in use across every card as ONE number in the household base currency (the per-currency
 * amounts and rates one tap away), a bar with the share used and the total limit, and the month's top
 * spending categories (also in the base currency).
 */
export function CreditUtilization({
  overview,
  insights,
  insightsStatus,
  onRetryInsights,
  language,
}: {
  overview: CreditCardOverview;
  insights: CreditCardInsights | undefined;
  insightsStatus: "loading" | "error" | "ready";
  onRetryInsights: () => void;
  language: string;
}) {
  const { combined } = overview;
  const hasLimit = combined.limitTotal.byCurrency.length > 0;
  const used = combined.limitUsed.total;
  const limit = combined.limitTotal.total;
  const percent =
    used !== null && limit !== null && limit > 0
      ? Math.min(100, Math.round((used / limit) * 100))
      : null;

  let categories: React.ReactNode;
  if (insightsStatus === "error") {
    categories = <ErrorState title="Couldn't load categories" onRetry={onRetryInsights} />;
  } else if (insightsStatus === "loading" || !insights) {
    categories = <CategoryRowsSkeleton />;
  } else if (insights.combined.byCategory.length === 0) {
    categories = (
      <EmptyState
        variant="embedded"
        title="No spending"
        description="Nothing on this month's statements."
      />
    );
  } else {
    const fx = insights.combined.fx;
    categories = (
      <ul aria-label="Top categories">
        {insights.combined.byCategory.slice(0, TOP_CATEGORIES_COUNT).map((category) => (
          <li key={category.categoryId ?? "none"} className={ROW_CLASS}>
            <CategoryDisplay
              category={{ name: category.name, color: category.color, icon: null }}
              variant="inline"
              size="sm"
              className="min-w-0"
            />
            {category.amount.total === null ? (
              <CombinedAmountDisplay
                combined={category.amount}
                fx={fx}
                language={language}
                size="sm"
              />
            ) : (
              <AmountDisplay
                amount={category.amount.total}
                currencyCode={fx.baseCurrencyCode}
                precision={fx.basePrecision}
                language={language}
                showSign={false}
                size="sm"
              />
            )}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <PageSection title={TITLE} description={DESCRIPTION}>
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">In use</span>
            <CombinedAmountDisplay
              combined={combined.limitUsed}
              fx={combined.fx}
              language={language}
              size="lg"
              className="text-2xl font-semibold tracking-tight"
            />
          </div>
          {hasLimit ? (
            <>
              <div
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="img"
                aria-label={percent === null ? "Limit used" : `${percent}% of the limit used`}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    percent !== null && percent >= 90 ? "bg-destructive" : "bg-primary",
                  )}
                  style={{ width: `${percent ?? 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>{percent === null ? "Used" : `Used: ${percent}%`}</span>
                <span className="flex items-center gap-1">
                  Total limit:
                  <CombinedAmountDisplay
                    combined={combined.limitTotal}
                    fx={combined.fx}
                    language={language}
                    size="xs"
                  />
                </span>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Your cards have no limits set.</p>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Top categories</h3>
          {categories}
        </div>
      </div>
    </PageSection>
  );
}

function CategoryRowsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading categories">
      {Array.from({ length: TOP_CATEGORIES_COUNT }, (_, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
        <div key={index} className={ROW_CLASS}>
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Loading twin of `CreditUtilization`: same section, headline, bar row and category rows. */
export function CreditUtilizationSkeleton() {
  return (
    <PageSection title={TITLE} description={DESCRIPTION}>
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">In use</span>
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium">Top categories</h3>
          <CategoryRowsSkeleton />
        </div>
      </div>
    </PageSection>
  );
}
