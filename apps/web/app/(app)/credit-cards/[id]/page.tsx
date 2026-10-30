"use client";

import { Delete02Icon, MoreHorizontalIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import { buildLimitBreakdown, todayISODate } from "@luraba/domain";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { CardTransactionSheet } from "@/components/credit-cards/card-transaction-sheet";
import { CreditCardPreview } from "@/components/credit-cards/credit-card-preview";
import { CreditCardSheet } from "@/components/credit-cards/credit-card-sheet";
import { InvoiceDetail } from "@/components/credit-cards/invoice-detail";
import { InvoiceHistoryChart } from "@/components/credit-cards/invoice-history-chart";
import { InvoiceStrip } from "@/components/credit-cards/invoice-strip";
import { LimitBreakdown } from "@/components/credit-cards/limit-breakdown";
import { PayInvoiceModal } from "@/components/credit-cards/pay-invoice-modal";
import { ErrorState } from "@/components/error-state";
import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { MonthSelector } from "@/components/finance/month-selector";
import { PERMISSIONS, useCan } from "@/components/permissions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal, ModalBody, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Typography } from "@/components/ui/typography";
import { useCurrencyPrecision } from "@/hooks/use-currency-precision";
import { useDisclosure } from "@/hooks/use-disclosure";
import {
  currentMonthKey,
  type InvoiceLine,
  invoiceLineToFeedRow,
  invoiceMonthKey,
  shiftMonthKey,
} from "@/lib/credit-card-invoices";
import { FALLBACK_CURRENCY_CODE } from "@/lib/finance";
import { queryClient } from "@/lib/query-client";
import { useDeleteCreditCardMutation } from "@/mutations/credit-cards/use-credit-card-mutations";
import {
  creditCardQueryKeys,
  useCreditCardCycleQuery,
  useCreditCardForecastQuery,
  useCreditCardOverviewQuery,
  useCreditCardQuery,
} from "@/queries/credit-cards/use-credit-cards-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

/** Invoices shown before the current month, and in total (the API allows up to 24 months). */
const MONTHS_BEFORE = 8;
const MONTHS_SHOWN = 24;

export default function CreditCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const can = useCan();
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const precisionOf = useCurrencyPrecision();
  const editSheet = useDisclosure();
  const payModal = useDisclosure();
  const deleteModal = useDisclosure();
  const [chosenCycleId, setChosenCycleId] = React.useState<string | undefined>();
  const [selectedRow, setSelectedRow] = React.useState<TransactionFeedRow | null>(null);

  const cardQuery = useCreditCardQuery(id);
  const thisMonth = currentMonthKey(timezone);
  const forecastQuery = useCreditCardForecastQuery(id, {
    fromMonth: shiftMonthKey(thisMonth, -MONTHS_BEFORE),
    months: MONTHS_SHOWN,
  });
  const overviewQuery = useCreditCardOverviewQuery({ month: thisMonth });
  const deleteMutation = useDeleteCreditCardMutation({
    successToast: { title: "Credit card deleted" },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: creditCardQueryKeys.all });
      router.push("/credit-cards");
    },
  });

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
  const selectedIndex = selectedCycle ? cycles.indexOf(selectedCycle) : -1;
  const cycleQuery = useCreditCardCycleQuery(id, selectedCycle?.id ?? "");
  const card = cardQuery.data;
  const precision = precisionOf(card?.currencyCode ?? FALLBACK_CURRENCY_CODE);
  const limit = React.useMemo(
    () => (card ? buildLimitBreakdown(card.creditLimitAmount, cycles, todayISODate()) : null),
    [card, cycles],
  );
  const cardOverview = overviewQuery.data?.cards.find((item) => item.creditCardId === id);
  const limitBreakdown = cardOverview?.limit ?? limit;

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

  if (cardQuery.isPending) {
    return (
      <InternalPageLayout
        title="Credit card"
        subtitle="Invoices, limit and the purchases behind each one."
        back={{ href: "/credit-cards", label: "Credit cards" }}
      >
        <Skeleton className="h-56 rounded-xl bg-muted/50" />
      </InternalPageLayout>
    );
  }
  if (cardQuery.isError || !card) {
    return (
      <InternalPageLayout
        title="Credit card"
        subtitle="Invoices, limit and the purchases behind each one."
        back={{ href: "/credit-cards", label: "Credit cards" }}
      >
        <ErrorState
          title="Couldn't load this credit card"
          description={cardQuery.error?.message || "An unexpected error occurred."}
          onRetry={() => void cardQuery.refetch()}
        />
      </InternalPageLayout>
    );
  }

  return (
    <InternalPageLayout
      title={card.name}
      createdBy={card.createdByUserId}
      subtitle="Invoices, limit and the purchases behind each one."
      back={{ href: "/credit-cards", label: "Credit cards" }}
      actions={
        <div className="flex items-center gap-2">
          {selectedCycle ? (
            <MonthSelector
              value={invoiceMonthKey(selectedCycle)}
              onChange={(monthKey) => {
                const match = cycles.find((cycle) => invoiceMonthKey(cycle) === monthKey);
                if (match) setChosenCycleId(match.id);
              }}
              minMonth={invoiceMonthKey(cycles[0] ?? selectedCycle)}
              maxMonth={invoiceMonthKey(cycles[cycles.length - 1] ?? selectedCycle)}
              language={language}
            />
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Card actions">
                <HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={!can(PERMISSIONS.CREDIT_CARDS_UPDATE)}
                onSelect={editSheet.onOpen}
              >
                <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                Edit card
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                disabled={!can(PERMISSIONS.CREDIT_CARDS_DELETE)}
                onSelect={deleteModal.onOpen}
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                Delete card
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <CreditCardPreview
            brand={card.brand}
            color={card.color ?? undefined}
            institutionName={card.institutionName ?? undefined}
            last4={card.last4}
            name={card.name}
          />
          <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 p-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Invoice closes</dt>
              <dd className="font-medium">Day {card.closingDay}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Invoice due</dt>
              <dd className="font-medium">Day {card.dueDay}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground">Account that pays it</dt>
              <dd className="font-medium">{card.ownerAccount.name}</dd>
            </div>
          </dl>
          {limitBreakdown ? (
            <LimitBreakdown
              breakdown={limitBreakdown}
              currencyCode={card.currencyCode}
              language={language}
              precision={precision}
            />
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          {forecastQuery.isPending ? (
            <Skeleton className="h-64 rounded-xl bg-muted/50" />
          ) : forecastQuery.isError ? (
            <ErrorState
              title="Couldn't load invoices"
              description={forecastQuery.error.message}
              onRetry={() => void forecastQuery.refetch()}
            />
          ) : cycles.length === 0 || !selectedCycle ? (
            <Typography variant="body-muted">This card has no invoices yet.</Typography>
          ) : (
            <>
              <section className="rounded-xl border border-border/60 p-4">
                <Typography variant="small-strong" className="mb-2">
                  Invoices
                </Typography>
                <InvoiceHistoryChart
                  cycles={cycles}
                  selectedId={selectedCycle.id}
                  onSelect={setChosenCycleId}
                  currencyCode={card.currencyCode}
                  language={language}
                  precision={precision}
                />
                <div className="mt-3">
                  <InvoiceStrip
                    cycles={cycles}
                    selectedId={selectedCycle.id}
                    onSelect={setChosenCycleId}
                    currencyCode={card.currencyCode}
                    language={language}
                    precision={precision}
                  />
                </div>
              </section>

              <InvoiceDetail
                cycle={selectedCycle}
                previousAmount={
                  selectedIndex > 0 ? (cycles[selectedIndex - 1]?.statementAmount ?? null) : null
                }
                details={cycleQuery.data}
                isLoading={cycleQuery.isPending}
                error={cycleQuery.error}
                onRetry={() => void cycleQuery.refetch()}
                currencyCode={card.currencyCode}
                language={language}
                precision={precision}
                cardName={card.name}
                onSelectLine={(line: InvoiceLine) =>
                  setSelectedRow(invoiceLineToFeedRow(line, card))
                }
                onPay={payModal.onOpen}
              />
            </>
          )}
        </div>
      </div>

      <CreditCardSheet open={editSheet.isOpen} onOpenChange={editSheet.setIsOpen} card={card} />
      <PayInvoiceModal
        open={payModal.isOpen}
        onOpenChange={payModal.setIsOpen}
        card={card}
        suggestedAmount={unpaidUpToSelected}
        precision={precision}
        coversOlderInvoices={coversOlder}
      />
      <CardTransactionSheet row={selectedRow} onClose={() => setSelectedRow(null)} />
      <Modal open={deleteModal.isOpen} onOpenChange={deleteModal.setIsOpen}>
        <ModalContent
          title="Delete this card?"
          description={`${card.name} and its invoices will be removed. This can't be undone.`}
          variant="destructive"
          isLoading={deleteMutation.isPending}
          size="sm"
        >
          <ModalBody>
            {deleteMutation.errorMessage ? (
              <Typography variant="small-destructive">{deleteMutation.errorMessage}</Typography>
            ) : null}
          </ModalBody>
          <ModalFooter
            cancelLabel="Cancel"
            confirmLabel="Delete"
            isLoading={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate(card.id)}
          />
        </ModalContent>
      </Modal>
    </InternalPageLayout>
  );
}
