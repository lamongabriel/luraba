"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarRange, ChevronRight, CreditCard, PencilLine, Plus, ReceiptText } from "lucide-react";

import { CreditCardPreview } from "@/components/finance/credit-card-preview";
import { EmptyState } from "@/components/finance/empty-state";
import { CreditCardCycleSheet } from "@/components/finance/forms/credit-card-cycle-sheet";
import { CreditCardFormSheet } from "@/components/finance/forms/credit-card-form-sheet";
import { CreditCardPaymentSheet } from "@/components/finance/forms/credit-card-payment-sheet";
import { CreditCardPurchaseSheet } from "@/components/finance/forms/credit-card-purchase-sheet";
import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Button } from "@/components/ui/button";
import { ACCOUNT_TYPE_LABELS, isCreditCardAccount } from "@/lib/finance";
import { useAccountHistoryQuery } from "@/queries/use-account-history.query";
import { useAccountsQuery } from "@/queries/use-accounts.query";
import { useCategoriesQuery } from "@/queries/use-categories.query";
import { useCreditCardCycleQuery } from "@/queries/use-credit-card-cycle.query";
import { useCreditCardCyclesQuery } from "@/queries/use-credit-card-cycles.query";
import { useCreditCardForecastQuery } from "@/queries/use-credit-card-forecast.query";
import { useCreditCardQuery } from "@/queries/use-credit-card.query";
import { useCreditCardsQuery } from "@/queries/use-credit-cards.query";

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const accountId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [editCardOpen, setEditCardOpen] = React.useState(false);
  const [purchaseOpen, setPurchaseOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [cycleEditOpen, setCycleEditOpen] = React.useState(false);
  const [selectedCycleId, setSelectedCycleId] = React.useState<string | undefined>();

  const { data: accounts = [] } = useAccountsQuery();
  const { data: history, isLoading: historyLoading } = useAccountHistoryQuery(accountId);
  const { data: categories = [] } = useCategoriesQuery();
  const { data: cards = [] } = useCreditCardsQuery();

  const account = accounts.find((item) => item.id === accountId) ?? (history ? { ...history.account, balance: history.balance } : undefined);
  const cardSummary = cards.find((item) => item.accountId === accountId);
  const { data: creditCard = cardSummary } = useCreditCardQuery(cardSummary?.id ?? "");
  const { data: cycles = [] } = useCreditCardCyclesQuery(creditCard?.id ?? "");
  const { data: selectedCycleDetail } = useCreditCardCycleQuery(creditCard?.id ?? "", selectedCycleId);
  const { data: forecast } = useCreditCardForecastQuery(creditCard?.id ?? "", undefined, 6);

  React.useEffect(() => {
    if (cycles.length > 0 && !selectedCycleId) {
      setSelectedCycleId(cycles[0]?.id);
    }
  }, [cycles, selectedCycleId]);

  const selectedCycle = cycles.find((cycle) => cycle.id === selectedCycleId) ?? cycles[0];

  if (!account && !historyLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Account not found" description="This account could not be found in the current workspace." />
        <EmptyState
          title="Account unavailable"
          description="Go back to the accounts list and pick another account."
          action={
            <Button asChild>
              <Link href="/accounts">Back to accounts</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (!account) {
    return <p className="text-sm text-muted-foreground">Loading account...</p>;
  }

  const historyItems = history?.items ?? [];

  if (isCreditCardAccount(account) && !creditCard) {
    return <p className="text-sm text-muted-foreground">Loading credit card details...</p>;
  }

  if (isCreditCardAccount(account) && creditCard) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={creditCard.name}
          description={`${creditCard.brand} ending in ${creditCard.last4}. Statement cycles and forecast are tracked separately from the liability balance.`}
          actions={
            <>
              <Button variant="outline" className="rounded-full" onClick={() => setEditCardOpen(true)}>
                <PencilLine className="size-4" />
                Edit card
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => setPaymentOpen(true)}>
                <ReceiptText className="size-4" />
                Make payment
              </Button>
              <Button className="rounded-full" onClick={() => setPurchaseOpen(true)}>
                <Plus className="size-4" />
                New purchase
              </Button>
            </>
          }
        />

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.9fr]">
          <CreditCardPreview
            brand={creditCard.brand}
            last4={creditCard.last4}
            name={creditCard.name}
            color={creditCard.color}
            subtitle={`Closes on day ${creditCard.closingDay} • Due on day ${creditCard.dueDay}`}
            balance={<MoneyValue amount={creditCard.balance} currencyCode={creditCard.currencyCode} />}
            detail
            className="min-h-[300px]"
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
            <SummaryCard
              label="Amount owed"
              value={<MoneyValue amount={creditCard.balance} currencyCode={creditCard.currencyCode} />}
              hint="Live liability balance"
              accent="negative"
            />
            <SummaryCard
              label="Unapplied credit"
              value={<MoneyValue amount={creditCard.unappliedCreditAmount} currencyCode={creditCard.currencyCode} />}
              hint="Extra payments waiting to offset future cycles"
            />
            <SummaryCard
              label="Billing cadence"
              value={`Close ${creditCard.closingDay} / Due ${creditCard.dueDay}`}
              hint={creditCard.institutionName ?? "Manual credit card"}
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <SectionPanel
            title="Billing cycles"
            description="Select a cycle to inspect its items, due amount, and dates."
            action={
              selectedCycle ? (
                <Button variant="outline" className="rounded-full" onClick={() => setCycleEditOpen(true)}>
                  <CalendarRange className="size-4" />
                  Edit cycle
                </Button>
              ) : null
            }
          >
            {cycles.length === 0 ? (
              <EmptyState title="No cycles yet" description="Purchases will create or populate billing cycles automatically." />
            ) : (
              <div className="space-y-3">
                {cycles.map((cycle) => (
                  <button
                    key={cycle.id}
                    type="button"
                    onClick={() => setSelectedCycleId(cycle.id)}
                    className={`w-full rounded-[1rem] border px-4 py-4 text-left transition ${
                      selectedCycleId === cycle.id
                        ? "border-primary/40 bg-primary/5"
                        : "border-border/70 bg-[var(--color-container-inset)] hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {cycle.periodStart} to {cycle.periodEnd}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Closing {cycle.closingDate} • Due {cycle.dueDate}
                        </p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <StatusPill tone={cycle.status}>{cycle.status}</StatusPill>
                      <div className="text-right">
                        <div className="font-semibold">
                          <MoneyValue amount={cycle.remainingAmount} currencyCode={creditCard.currencyCode} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Statement <MoneyValue amount={cycle.statementAmount} currencyCode={creditCard.currencyCode} />
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SectionPanel>

          <SectionPanel
            title="Selected cycle"
            description="Installments and statement items assigned to the current billing cycle."
          >
            {selectedCycleDetail ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <SummaryCard
                    label="Statement amount"
                    value={<MoneyValue amount={selectedCycleDetail.cycle.statementAmount} currencyCode={creditCard.currencyCode} />}
                  />
                  <SummaryCard
                    label="Paid amount"
                    value={<MoneyValue amount={selectedCycleDetail.cycle.paidAmount} currencyCode={creditCard.currencyCode} />}
                    accent="positive"
                  />
                  <SummaryCard
                    label="Remaining"
                    value={<MoneyValue amount={selectedCycleDetail.cycle.remainingAmount} currencyCode={creditCard.currencyCode} />}
                    accent="negative"
                  />
                </div>

                {selectedCycleDetail.items.length === 0 ? (
                  <EmptyState title="No items in this cycle" description="This cycle does not have any assigned purchases yet." />
                ) : (
                  <div className="space-y-3">
                    {selectedCycleDetail.items.map((item) => (
                      <div key={item.installmentId} className="rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{item.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Installment {item.installmentNumber} of {item.installmentCount} • {item.postedDate}
                            </p>
                          </div>
                          <div className="font-semibold">
                            <MoneyValue amount={item.amount} currencyCode={creditCard.currencyCode} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a billing cycle to load its statement items.</p>
            )}
          </SectionPanel>
        </div>

        <SectionPanel title="Forecast" description="Upcoming statements and installment obligations across the next cycles.">
          {forecast && forecast.cycles.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {forecast.cycles.map((cycle) => (
                <div key={cycle.id} className="rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {cycle.periodStart} to {cycle.periodEnd}
                      </p>
                      <p className="text-xs text-muted-foreground">Due {cycle.dueDate}</p>
                    </div>
                    <StatusPill tone={cycle.status}>{cycle.status}</StatusPill>
                  </div>
                  <div className="mt-4 text-xl font-semibold">
                    <MoneyValue amount={cycle.remainingAmount} currencyCode={creditCard.currencyCode} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{cycle.items.length} scheduled item(s)</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No forecast data" description="The forecast will appear as soon as this card has billing cycles and purchases." />
          )}
        </SectionPanel>

        <SectionPanel title="Account activity" description="Ledger-centric history for this credit card account.">
          {historyItems.length === 0 ? (
            <EmptyState title="No credit card activity yet" description="Create a card purchase or payment to start building the timeline." />
          ) : (
            <div className="space-y-3">
              {historyItems.map((item) => (
                <div key={item.entryId} className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.postedDate} • {item.paymentMethodName ?? item.type}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      <MoneyValue amount={item.amount} currencyCode={item.currencyCode} />
                    </div>
                    <StatusPill tone={item.amount > 0 ? "positive" : "negative"}>{item.type}</StatusPill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>

        <CreditCardFormSheet open={editCardOpen} onOpenChange={setEditCardOpen} card={creditCard} />
        <CreditCardPurchaseSheet open={purchaseOpen} onOpenChange={setPurchaseOpen} card={creditCard} categories={categories} />
        <CreditCardPaymentSheet open={paymentOpen} onOpenChange={setPaymentOpen} card={creditCard} accounts={accounts} />
        {selectedCycle ? (
          <CreditCardCycleSheet
            open={cycleEditOpen}
            onOpenChange={setCycleEditOpen}
            creditCardId={creditCard.id}
            cycle={selectedCycle}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.name}
        description={`${ACCOUNT_TYPE_LABELS[account.type]} account in ${account.currencyCode}.`}
        actions={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/transactions">Open transactions</Link>
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryCard
          label="Balance"
          value={<MoneyValue amount={history?.balance ?? account.balance} currencyCode={account.currencyCode} />}
          accent={account.classification === "asset" ? "positive" : "negative"}
        />
        <SummaryCard label="Classification" value={account.classification} hint={ACCOUNT_TYPE_LABELS[account.type]} />
        <SummaryCard label="Institution" value={account.institutionName ?? "Manual account"} hint={account.currencyCode} />
      </div>

      <SectionPanel title="Account history" description="All posted entries affecting this account balance.">
        {historyItems.length === 0 ? (
          <EmptyState title="No history yet" description="Create a transaction to start building the account ledger timeline." />
        ) : (
          <div className="space-y-3">
            {historyItems.map((item) => (
              <div key={item.entryId} className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                <div>
                  <p className="font-medium">{item.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.postedDate} • {item.paymentMethodName ?? item.type}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    <MoneyValue amount={item.amount} currencyCode={item.currencyCode} />
                  </div>
                  <StatusPill tone={item.amount > 0 ? "positive" : "negative"}>{item.type}</StatusPill>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
    </div>
  );
}
