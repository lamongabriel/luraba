"use client";

import { Calendar03Icon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import type { ListTransactionsQuery, TransactionFeedRow } from "@luraba/contracts";
import { buildLimitBreakdown, todayISODate } from "@luraba/domain";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { CardPurchasesTable } from "@/components/credit-cards/card-purchases-table";
import { CardTransactionSheet } from "@/components/credit-cards/card-transaction-sheet";
import { CreditCardDetailsPanel } from "@/components/credit-cards/credit-card-details-panel";
import { CreditCardPreview } from "@/components/credit-cards/credit-card-preview";
import { CreditCardSheet } from "@/components/credit-cards/credit-card-sheet";
import {
  InvoiceComposition,
  InvoicePayments,
  InvoiceSummary,
} from "@/components/credit-cards/invoice-detail";
import { InvoiceHistoryChart } from "@/components/credit-cards/invoice-history-chart";
import { InvoiceList, InvoiceListSkeleton } from "@/components/credit-cards/invoice-list";
import { LimitBreakdown, LimitBreakdownSkeleton } from "@/components/credit-cards/limit-breakdown";
import { PayInvoiceModal } from "@/components/credit-cards/pay-invoice-modal";
import { HeaderButton } from "@/components/finance/header-actions";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MonthSelect } from "@/components/finance/month-select";
import { PageSection } from "@/components/finance/page-section";
import { PERMISSIONS } from "@/components/permissions";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useDisclosure } from "@/hooks/use-disclosure";
import { currentMonthKey, invoiceMonthKey, shiftMonthKey } from "@/lib/credit-card-invoices";
import { FALLBACK_CURRENCY_CODE } from "@/lib/finance";
import {
  useCreditCardCycleQuery,
  useCreditCardForecastQuery,
  useCreditCardOverviewQuery,
  useCreditCardQuery,
} from "@/queries/credit-cards/use-credit-cards-query";
import { useTransactionLookupsQuery } from "@/queries/transactions/use-transaction-lookups-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";
import { InvoicesEmpty } from "./_empty";
import { CreditCardDetailError, InvoicesError } from "./_error";
import { CreditCardDetailLoading, InvoicesLoading } from "./_loading";

/** Invoices shown before the current month, and in total (the API allows up to 24 months). */
const MONTHS_BEFORE = 8;
const MONTHS_SHOWN = 24;

export default function CreditCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const precisionOf = useCurrencyPrecision();
  const editSheet = useDisclosure();
  const payModal = useDisclosure();
  const [chosenCycleId, setChosenCycleId] = React.useState<string | undefined>();
  const [selectedRow, setSelectedRow] = React.useState<TransactionFeedRow | null>(null);

  const cardQuery = useCreditCardQuery(id);
  const thisMonth = currentMonthKey(timezone);
  const forecastQuery = useCreditCardForecastQuery(id, {
    fromMonth: shiftMonthKey(thisMonth, -MONTHS_BEFORE),
    months: MONTHS_SHOWN,
  });
  const overviewQuery = useCreditCardOverviewQuery({ month: thisMonth });
  const lookupsQuery = useTransactionLookupsQuery();

  const cycles = React.useMemo(
    () =>
      [...(forecastQuery.data?.cycles ?? [])]
        .sort((left, right) => left.dueDate.localeCompare(right.dueDate))
        .map(({ items: _items, ...cycle }) => cycle),
    [forecastQuery.data],
  );
  const defaultCycle =
    cycles.find((cycle) => cycle.displayStatus === "overdue" || cycle.displayStatus === "due") ??
    cycles.find((cycle) => cycle.displayStatus === "current") ??
    cycles[0];
  const selectedCycle = cycles.find((cycle) => cycle.id === chosenCycleId) ?? defaultCycle;
  const currentCycle = cycles.find((cycle) => cycle.displayStatus === "current");
  const selectedIndex = selectedCycle ? cycles.indexOf(selectedCycle) : -1;
  const cycleQuery = useCreditCardCycleQuery(id, selectedCycle?.id ?? "");
  const card = cardQuery.data;
  const precision = precisionOf(card?.currencyCode ?? FALLBACK_CURRENCY_CODE);
  const limitBreakdown = React.useMemo(
    () =>
      overviewQuery.data?.cards.find((item) => item.creditCardId === id)?.limit ??
      (card ? buildLimitBreakdown(card.creditLimitAmount, cycles, todayISODate()) : null),
    [overviewQuery.data, id, card, cycles],
  );
  const tableFilters = React.useMemo<Partial<ListTransactionsQuery>>(
    () => ({
      creditCardIds: [id],
      originTypes: ["credit_card_installment"],
      billingCycleIds: selectedCycle ? [selectedCycle.id] : [],
    }),
    [id, selectedCycle],
  );

  // Everything unpaid up to the selected invoice, since payments settle the oldest invoice first.
  const unpaidUpToSelected = selectedCycle
    ? cycles
        .filter(
          (cycle) =>
            cycle.displayStatus !== "upcoming" &&
            cycle.dueDate <= selectedCycle.dueDate &&
            cycle.remainingAmount > 0,
        )
        .reduce((total, cycle) => total + cycle.remainingAmount, 0)
    : 0;
  const coversOlder = selectedCycle
    ? cycles.some(
        (cycle) =>
          cycle.id !== selectedCycle.id &&
          cycle.displayStatus !== "upcoming" &&
          cycle.dueDate < selectedCycle.dueDate &&
          cycle.remainingAmount > 0,
      )
    : false;

  if (cardQuery.isPending) return <CreditCardDetailLoading />;
  if (cardQuery.isError || !card) {
    return (
      <CreditCardDetailError
        message={cardQuery.error?.message}
        onRetry={() => void cardQuery.refetch()}
      />
    );
  }

  const hasPayments = (cycleQuery.data?.payments.length ?? 0) > 0;
  const invoiceSection = forecastQuery.isPending ? (
    <InvoicesLoading />
  ) : forecastQuery.isError ? (
    <InvoicesError
      message={forecastQuery.error.message}
      onRetry={() => void forecastQuery.refetch()}
    />
  ) : cycles.length === 0 || !selectedCycle ? (
    <InvoicesEmpty />
  ) : (
    <div className="space-y-6">
      <InvoiceHistoryChart
        cycles={cycles}
        selectedId={selectedCycle.id}
        onSelect={setChosenCycleId}
        currencyCode={card.currencyCode}
        language={language}
        precision={precision}
      />
      <div className="border-t border-border/60 pt-5">
        <InvoiceSummary
          cycle={selectedCycle}
          previousAmount={
            selectedIndex > 0 ? (cycles[selectedIndex - 1]?.statementAmount ?? null) : null
          }
          details={cycleQuery.data}
          cardName={card.name}
          onPay={payModal.onOpen}
          currencyCode={card.currencyCode}
          language={language}
          precision={precision}
        />
      </div>
      {hasPayments && cycleQuery.data ? (
        <InvoicePayments
          payments={cycleQuery.data.payments}
          currencyCode={card.currencyCode}
          language={language}
          precision={precision}
        />
      ) : null}
      <div className="mt-2">
        <CardPurchasesTable
          divider={hasPayments}
          title="Invoice expenses"
          description="Purchases and installments on this invoice"
          filters={tableFilters}
          language={language}
          onView={setSelectedRow}
          emptyTitle="No purchases on this invoice"
          emptyDescription="Purchases made in this billing period appear here."
        />
      </div>
    </div>
  );

  return (
    <InternalPageLayout
      title={card.name}
      subtitle={`${card.institutionName ? `${card.institutionName} · ` : ""}${card.brand} •••• ${card.last4}`}
      back={{ href: "/credit-cards", label: "Credit cards" }}
      controls={
        selectedCycle ? (
          <MonthSelect
            value={invoiceMonthKey(selectedCycle)}
            onChange={(monthKey) => {
              const match = cycles.find((cycle) => invoiceMonthKey(cycle) === monthKey);
              if (match) setChosenCycleId(match.id);
            }}
            timezone={timezone}
            minMonth={invoiceMonthKey(cycles[0] ?? selectedCycle)}
            maxMonth={invoiceMonthKey(cycles[cycles.length - 1] ?? selectedCycle)}
            language={language}
          />
        ) : null
      }
      actions={
        <>
          {currentCycle && selectedCycle && selectedCycle.id !== currentCycle.id ? (
            <HeaderButton
              label="Current invoice"
              icon={Calendar03Icon}
              onClick={() => setChosenCycleId(currentCycle.id)}
            />
          ) : null}
          <HeaderButton
            label="Edit"
            icon={PencilEdit02Icon}
            permission={PERMISSIONS.CREDIT_CARDS_UPDATE}
            deniedMessage="Your household role cannot edit credit cards."
            onClick={editSheet.onOpen}
          />
        </>
      }
    >
      <div className="grid min-w-0 items-stretch gap-8 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <aside className="flex min-w-0 flex-col gap-5">
          <CreditCardPreview
            brand={card.brand}
            color={card.color ?? undefined}
            institutionName={card.institutionName ?? undefined}
            last4={card.last4}
            name={card.name}
          />
          <CreditCardDetailsPanel card={card} />
          {limitBreakdown ? (
            <LimitBreakdown
              breakdown={limitBreakdown}
              currencyCode={card.currencyCode}
              language={language}
              precision={precision}
            />
          ) : overviewQuery.isPending ? (
            <LimitBreakdownSkeleton />
          ) : null}
          <InvoiceComposition
            details={cycleQuery.data}
            isLoading={forecastQuery.isPending || cycleQuery.isPending}
            error={cycleQuery.error}
            onRetry={() => void cycleQuery.refetch()}
            categories={lookupsQuery.data?.categories}
            currencyCode={card.currencyCode}
            language={language}
            precision={precision}
          />
          <PageSection divider title="All invoices" className="flex flex-1 flex-col">
            <div className="relative min-h-52 flex-1">
              {forecastQuery.isPending ? (
                <InvoiceListSkeleton />
              ) : (
                <InvoiceList
                  cycles={cycles}
                  selectedId={selectedCycle?.id}
                  onSelect={setChosenCycleId}
                  currencyCode={card.currencyCode}
                  language={language}
                  precision={precision}
                />
              )}
            </div>
          </PageSection>
        </aside>
        <div className="min-w-0">{invoiceSection}</div>
      </div>

      <CreditCardSheet
        open={editSheet.isOpen}
        onOpenChange={editSheet.setIsOpen}
        card={card}
        onDeleted={() => router.push("/credit-cards")}
      />
      <PayInvoiceModal
        open={payModal.isOpen}
        onOpenChange={payModal.setIsOpen}
        card={card}
        suggestedAmount={unpaidUpToSelected}
        precision={precision}
        coversOlderInvoices={coversOlder}
      />
      <CardTransactionSheet row={selectedRow} onClose={() => setSelectedRow(null)} />
    </InternalPageLayout>
  );
}
