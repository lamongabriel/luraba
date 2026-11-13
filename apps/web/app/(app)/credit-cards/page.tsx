"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import * as React from "react";
import { CardTransactionSheet } from "@/components/credit-cards/card-transaction-sheet";
import { CreditCardSheet } from "@/components/credit-cards/credit-card-sheet";
import { CreditCardsCarousel } from "@/components/credit-cards/credit-cards-carousel";
import { CreditUtilization } from "@/components/credit-cards/credit-utilization";
import { RecentCardTransactions } from "@/components/credit-cards/recent-card-transactions";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MonthPicker } from "@/components/finance/month-picker";
import { SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { DataBoundary } from "@/components/states";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useDisclosure } from "@/hooks/use-disclosure";
import { currentMonthKey, shiftMonthKey } from "@/lib/credit-card-invoices";
import {
  useCreditCardInsightsQuery,
  useCreditCardOverviewQuery,
} from "@/queries/credit-cards/use-credit-cards-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { CreditCardsEmpty } from "./_empty";
import { CreditCardsError } from "./_error";
import { CREDIT_CARDS_COLUMNS_CLASS } from "./_layout-classes";
import { CreditCardsLoading } from "./_loading";

/** How far the month picker goes back and ahead (the API reaches up to 24 months ahead). */
const MONTHS_BACK = 36;
const MONTHS_AHEAD = 12;

export default function CreditCardsPage() {
  const addSheet = useDisclosure();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const precisionOf = useCurrencyPrecision();
  // Until a month is picked the API opens on the statement that still needs attention.
  const [chosenMonth, setChosenMonth] = React.useState<string | undefined>();
  const [selectedRow, setSelectedRow] = React.useState<TransactionFeedRow | null>(null);

  const query = useCreditCardOverviewQuery(chosenMonth ? { month: chosenMonth } : {});
  const overview = query.data;
  const month = overview?.month;
  const insightsQuery = useCreditCardInsightsQuery(
    { month: month ?? "" },
    { enabled: Boolean(month) },
  );
  const thisMonth = currentMonthKey(timezone);

  const cycleIds = React.useMemo(
    () => (overview?.cards ?? []).flatMap((card) => (card.invoice ? [card.invoice.cycleId] : [])),
    [overview],
  );
  const insightsStatus = insightsQuery.isError ? "error" : insightsQuery.data ? "ready" : "loading";

  const content = (
    <DataBoundary
      isPending={query.isPending}
      isError={query.isError || (!query.isPending && !overview)}
      isEmpty={overview?.cards.length === 0}
      loading={<CreditCardsLoading />}
      errorState={
        <CreditCardsError message={query.error?.message} onRetry={() => void query.refetch()} />
      }
      empty={<CreditCardsEmpty onCreate={addSheet.onOpen} />}
    >
      {overview ? (
        <SectionReveal className="flex flex-col gap-8">
          <CreditCardsCarousel
            cards={overview.cards}
            language={language}
            precisionOf={precisionOf}
          />
          <div className={CREDIT_CARDS_COLUMNS_CLASS}>
            <div className="min-w-0 lg:col-span-8">
              <RecentCardTransactions
                cycleIds={cycleIds}
                language={language}
                onView={setSelectedRow}
              />
            </div>
            <div className="min-w-0 lg:col-span-4">
              <CreditUtilization
                overview={overview}
                insights={insightsQuery.data}
                insightsStatus={insightsStatus}
                onRetryInsights={() => void insightsQuery.refetch()}
                language={language}
              />
            </div>
          </div>
        </SectionReveal>
      ) : null}
    </DataBoundary>
  );

  return (
    <InternalPageLayout
      title="Credit cards"
      subtitle="Track your spending and upcoming statements."
      actions={
        <div className="flex items-center gap-2">
          <MonthPicker
            value={month ?? thisMonth}
            onChange={setChosenMonth}
            currentMonth={thisMonth}
            minMonth={shiftMonthKey(thisMonth, -MONTHS_BACK)}
            maxMonth={shiftMonthKey(thisMonth, MONTHS_AHEAD)}
            language={language}
          />
          <PermissionButton
            permission={PERMISSIONS.CREDIT_CARDS_CREATE}
            deniedMessage="Your household role cannot add credit cards."
            onClick={addSheet.onOpen}
            aria-label="Add credit card"
            className="max-md:size-9 max-md:rounded-full max-md:px-0"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            <span className="max-md:sr-only">Add credit card</span>
          </PermissionButton>
        </div>
      }
    >
      {content}
      <CreditCardSheet open={addSheet.isOpen} onOpenChange={addSheet.setIsOpen} />
      <CardTransactionSheet row={selectedRow} onClose={() => setSelectedRow(null)} />
    </InternalPageLayout>
  );
}
