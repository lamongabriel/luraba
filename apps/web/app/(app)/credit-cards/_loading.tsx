import { CreditCardsCarouselSkeleton } from "@/components/credit-cards/credit-cards-carousel";
import { CreditUtilizationSkeleton } from "@/components/credit-cards/credit-utilization";
import { RecentCardTransactionsSkeleton } from "@/components/credit-cards/recent-card-transactions";
import { CREDIT_CARDS_COLUMNS_CLASS } from "./_layout-classes";

/** Loading twin of the overview: the carousel, then the same two columns (transactions, utilization). */
export function CreditCardsLoading() {
  return (
    <div className="flex flex-col gap-8">
      <CreditCardsCarouselSkeleton />
      <div className={CREDIT_CARDS_COLUMNS_CLASS}>
        <div className="min-w-0 lg:col-span-8">
          <RecentCardTransactionsSkeleton />
        </div>
        <div className="min-w-0 lg:col-span-4">
          <CreditUtilizationSkeleton />
        </div>
      </div>
    </div>
  );
}
