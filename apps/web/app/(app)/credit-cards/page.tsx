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
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useDisclosure } from "@/hooks/use-disclosure";
import { useCreditCardOverviewQuery } from "@/queries/credit-cards/use-credit-cards-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

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

  let content: React.ReactNode;
  if (query.isPending) {
    content = (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-xl bg-muted/50" />
        <Skeleton className="h-56 rounded-xl bg-muted/50" />
      </div>
    );
  } else if (query.isError || !overview) {
    content = (
      <ErrorState
        title="Couldn't load credit cards"
        description={
          query.error?.message || "An unexpected error occurred while loading this page."
        }
        onRetry={() => void query.refetch()}
      />
    );
  } else if (overview.cards.length === 0) {
    content = (
      <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
        <Typography variant="small-strong">No credit cards yet</Typography>
        <Typography variant="small-muted" className="mt-1">
          Add a card to follow its invoices, installments and remaining limit.
        </Typography>
      </div>
    );
  } else {
    const currencies = overview.totals.map((total) => total.currencyCode);
    content = (
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
        <CreditCardCarousel cards={overview.cards} language={language} precisionOf={precisionOf} />
        <LatestCardTransactions
          language={language}
          cardNames={cardNames}
          onSelect={setSelectedRow}
        />
      </SectionReveal>
    );
  }

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
