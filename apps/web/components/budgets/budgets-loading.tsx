import { BudgetAside } from "@/components/budgets/budget-aside";
import { BUDGETS_BODY_GRID } from "@/components/budgets/budget-layout";
import { BudgetSummaryBandSkeleton } from "@/components/budgets/budget-summary-band";
import { CategoryBudgetsListSkeleton } from "@/components/budgets/category-budgets-list";

/** Mirrors `BudgetsContent`: the summary band, then the category list with the rail beside it. */
export function BudgetsLoading() {
  return (
    <div>
      <BudgetSummaryBandSkeleton />
      <div className={BUDGETS_BODY_GRID}>
        <CategoryBudgetsListSkeleton />
        <BudgetAside
          insights={undefined}
          isPending
          isError={false}
          onRetry={() => undefined}
          allocation={[]}
          money={{ currencyCode: "USD", precision: 2, language: "en" }}
        />
      </div>
    </div>
  );
}
