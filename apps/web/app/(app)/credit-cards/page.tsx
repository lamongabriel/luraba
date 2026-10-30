"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import * as React from "react";
import { CardTransactionSheet } from "@/components/credit-cards/card-transaction-sheet";
import { CreditCardCarousel } from "@/components/credit-cards/credit-card-carousel";
import { CreditCardSheet } from "@/components/credit-cards/credit-card-sheet";
import { LatestCardTransactions } from "@/components/credit-cards/latest-card-transactions";
import { LimitBreakdown } from "@/components/credit-cards/limit-breakdown";
import { OverviewSummary } from "@/components/credit-cards/overview-summary";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { DataBoundary } from "@/components/states";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useCreditCardOverviewQuery } from "@/queries/credit-cards/use-credit-cards-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { CreditCardsEmpty } from "./_empty";
import { CreditCardsError } from "./_error";
import { CreditCardsLoading } from "./_loading";

export default function CreditCardsPage() {
  const sheet = useDisclosure();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const precisionOf = useCurrencyPrecision();
  // No month is sent: the API opens on each card's invoice that still needs attention.
  const query = useCreditCardOverviewQuery();
  const [selectedRow, setSelectedRow] = React.useState<TransactionFeedRow | null>(null);
  const overview = query.data;
  const cardNames = React.useMemo(
    () => new Map((overview?.cards ?? []).map((card) => [card.creditCardId, card.name])),
    [overview],
  );

  const currencies = (overview?.totals ?? []).map((total) => total.currencyCode);
  const content = (
    <DataBoundary
      isPending={query.isPending}
      isError={query.isError || (!query.isPending && !overview)}
      isEmpty={overview?.cards.length === 0}
      loading={<CreditCardsLoading />}
      errorState={
        <CreditCardsError message={query.error?.message} onRetry={() => void query.refetch()} />
      }
      empty={<CreditCardsEmpty onCreate={sheet.onOpen} />}
    >
      {overview ? (
        <SectionReveal className="space-y-5">
          {overview.totals.map((total) => (
            <div
              key={total.currencyCode}
              className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,1fr)]"
            >
              <OverviewSummary
                overview={overview}
                currencyCode={total.currencyCode}
                language={language}
                precision={precisionOf(total.currencyCode)}
                showCurrency={currencies.length > 1}
              />
              <LimitBreakdown
                breakdown={total.limit}
                currencyCode={total.currencyCode}
                language={language}
                precision={precisionOf(total.currencyCode)}
                title={
                  currencies.length > 1 ? `Credit limit · ${total.currencyCode}` : "Credit limit"
                }
              />
            </div>
          ))}
          <CreditCardCarousel
            cards={overview.cards}
            language={language}
            precisionOf={precisionOf}
          />
          <LatestCardTransactions
            language={language}
            cardNames={cardNames}
            onSelect={setSelectedRow}
          />
        </SectionReveal>
      ) : null}
    </DataBoundary>
  );

  return (
    <InternalPageLayout
      title="Credit cards"
      subtitle="What you owe on each card, your remaining limit and recent activity."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <PermissionButton
            permission={PERMISSIONS.CREDIT_CARDS_CREATE}
            deniedMessage="Your household role cannot add credit cards."
            onClick={sheet.onOpen}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Add card
          </PermissionButton>
        </div>
      }
    >
      {content}
      <CreditCardSheet open={sheet.isOpen} onOpenChange={sheet.setIsOpen} />
      <CardTransactionSheet row={selectedRow} onClose={() => setSelectedRow(null)} />
    </InternalPageLayout>
  );
}
