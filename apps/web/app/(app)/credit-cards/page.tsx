"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import * as React from "react";
import { CardTransactionSheet } from "@/components/credit-cards/card-transaction-sheet";
import { CreditCardGrid } from "@/components/credit-cards/credit-card-grid";
import { CreditCardEditSheet, CreditCardSheet } from "@/components/credit-cards/credit-card-sheet";
import { OverviewInsights } from "@/components/credit-cards/overview-insights";
import { OverviewInvoices } from "@/components/credit-cards/overview-invoices";
import { OverviewKpis } from "@/components/credit-cards/overview-kpis";
import { RecentPurchases } from "@/components/credit-cards/recent-purchases";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MonthSelector } from "@/components/finance/month-selector";
import { SectionReveal } from "@/components/motion/reveal";
import { PERMISSIONS, PermissionButton } from "@/components/permissions";
import { DataBoundary } from "@/components/states";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useDisclosure } from "@/hooks/use-disclosure";
import { currentMonthKey, formatMonthKeyLabel, shiftMonthKey } from "@/lib/credit-card-invoices";
import {
  useCreditCardInsightsQuery,
  useCreditCardOverviewQuery,
} from "@/queries/credit-cards/use-credit-cards-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { CreditCardsEmpty } from "./_empty";
import { CreditCardsError } from "./_error";
import { CreditCardsLoading } from "./_loading";

/** How far the month picker goes back and ahead (the API reaches up to 24 months ahead). */
/** The two-zone grid (8 + 4) every row of the page uses, so the zones line up. */
const ZONES_CLASS = "grid min-w-0 gap-x-8 gap-y-10 lg:grid-cols-12 xl:gap-x-10";
const MONTHS_BACK = 36;
const MONTHS_AHEAD = 12;

export default function CreditCardsPage() {
  const addSheet = useDisclosure();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const precisionOf = useCurrencyPrecision();
  // Until a month is picked the API opens on the invoice that still needs attention.
  const [chosenMonth, setChosenMonth] = React.useState<string | undefined>();
  const [editingId, setEditingId] = React.useState<string | null>(null);
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
  const monthLabel = formatMonthKeyLabel(month ?? thisMonth, language);

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
        <SectionReveal className="flex flex-col gap-10">
          <OverviewKpis overview={overview} insights={insightsQuery.data} language={language} />
          <div className={ZONES_CLASS}>
            <div className="min-w-0 lg:col-span-8">
              <CreditCardGrid
                cards={overview.cards}
                language={language}
                precisionOf={precisionOf}
                onEdit={setEditingId}
              />
            </div>
            <div className="min-w-0 lg:col-span-4">
              <OverviewInvoices
                cards={overview.cards}
                language={language}
                precisionOf={precisionOf}
                monthLabel={monthLabel}
              />
            </div>
          </div>
          <div className={`${ZONES_CLASS} items-stretch`}>
            <div className="flex min-w-0 flex-col gap-10 lg:col-span-8">
              {overview.totals.map((total) => (
                <OverviewInsights
                  key={total.currencyCode}
                  group={insightsQuery.data?.groups.find(
                    (item) => item.currencyCode === total.currencyCode,
                  )}
                  currencyCode={total.currencyCode}
                  month={overview.month}
                  status={insightsStatus}
                  errorMessage={insightsQuery.error?.message}
                  onRetry={() => void insightsQuery.refetch()}
                  language={language}
                  precision={precisionOf(total.currencyCode)}
                />
              ))}
            </div>
            <div className="min-w-0 lg:col-span-4">
              <RecentPurchases
                cycleIds={cycleIds}
                cards={overview.cards}
                language={language}
                onView={setSelectedRow}
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
      subtitle="Your cards, their invoices and spending, month by month."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector
            value={month ?? thisMonth}
            onChange={setChosenMonth}
            minMonth={shiftMonthKey(thisMonth, -MONTHS_BACK)}
            maxMonth={shiftMonthKey(thisMonth, MONTHS_AHEAD)}
            language={language}
          />
          <PermissionButton
            permission={PERMISSIONS.CREDIT_CARDS_CREATE}
            deniedMessage="Your household role cannot add credit cards."
            onClick={addSheet.onOpen}
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
            Add credit card
          </PermissionButton>
        </div>
      }
    >
      {content}
      <CreditCardSheet open={addSheet.isOpen} onOpenChange={addSheet.setIsOpen} />
      <CreditCardEditSheet
        creditCardId={editingId}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
      />
      <CardTransactionSheet row={selectedRow} onClose={() => setSelectedRow(null)} />
    </InternalPageLayout>
  );
}
