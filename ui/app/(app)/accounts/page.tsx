"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, Landmark, Plus, Wallet } from "lucide-react";

import { CreditCardPreview } from "@/components/finance/credit-card-preview";
import { EmptyState } from "@/components/finance/empty-state";
import { CreditCardFormSheet } from "@/components/finance/forms/credit-card-form-sheet";
import { ManualAccountSheet } from "@/components/finance/forms/manual-account-sheet";
import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Button } from "@/components/ui/button";
import { ACCOUNT_TYPE_LABELS, CLASSIFICATION_LABELS, isCreditCardAccount, sumAccountBalances } from "@/lib/finance";
import { useAccountsQuery } from "@/queries/use-accounts.query";
import { useCreditCardsQuery } from "@/queries/use-credit-cards.query";
import { useFinanceUiStore } from "@/stores/finance-ui-store";
import { useAuthStore } from "@/stores/auth.store";

export default function AccountsPage() {
  const [accountSheetOpen, setAccountSheetOpen] = React.useState(false);
  const [creditCardSheetOpen, setCreditCardSheetOpen] = React.useState(false);
  const { accountScope, setAccountScope } = useFinanceUiStore();
  const preferredCurrency = useAuthStore((state) => state.user?.preferences.currency ?? "BRL");

  const { data: accounts = [], isLoading, isError } = useAccountsQuery();
  const { data: creditCards = [] } = useCreditCardsQuery();

  const creditCardsByAccountId = creditCards.reduce<Record<string, (typeof creditCards)[number]>>((map, card) => {
    map[card.accountId] = card;
    return map;
  }, {});

  const visibleAccounts =
    accountScope === "all"
      ? accounts
      : accounts.filter((account) => (accountScope === "assets" ? account.classification === "asset" : account.classification === "liability"));

  const assetAccounts = visibleAccounts.filter((account) => account.classification === "asset");
  const liabilityAccounts = visibleAccounts.filter((account) => account.classification === "liability");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Track assets and liabilities with one workspace for cash accounts, loans, property, and real credit cards."
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => setAccountSheetOpen(true)}>
              <Plus className="size-4" />
              New account
            </Button>
            <Button className="rounded-full" onClick={() => setCreditCardSheetOpen(true)}>
              <CreditCard className="size-4" />
              New credit card
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryCard
          label="Assets"
          value={<MoneyValue amount={sumAccountBalances(accounts, "asset")} currencyCode={preferredCurrency} />}
          hint={`${accounts.filter((account) => account.classification === "asset").length} asset accounts`}
          accent="positive"
        />
        <SummaryCard
          label="Liabilities"
          value={<MoneyValue amount={sumAccountBalances(accounts, "liability")} currencyCode={preferredCurrency} />}
          hint={`${accounts.filter((account) => account.classification === "liability").length} liability accounts`}
          accent="negative"
        />
        <SummaryCard
          label="Net position"
          value={
            <MoneyValue
              amount={sumAccountBalances(accounts, "asset") - sumAccountBalances(accounts, "liability")}
              currencyCode={preferredCurrency}
            />
          }
          hint="Displayed from the live accounts list"
          accent="brand"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={accountScope === "all" ? "default" : "outline"} className="rounded-full" onClick={() => setAccountScope("all")}>
          All accounts
        </Button>
        <Button variant={accountScope === "assets" ? "default" : "outline"} className="rounded-full" onClick={() => setAccountScope("assets")}>
          Assets
        </Button>
        <Button variant={accountScope === "debts" ? "default" : "outline"} className="rounded-full" onClick={() => setAccountScope("debts")}>
          Liabilities
        </Button>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading accounts...</p> : null}
      {isError ? <p className="text-sm text-destructive">Failed to load accounts.</p> : null}

      <SectionPanel title={CLASSIFICATION_LABELS.asset} description="Depository, property, vehicle, and other asset accounts.">
        {assetAccounts.length === 0 ? (
          <EmptyState
            title="No asset accounts in this view"
            description="Create a depository or other asset account to start tracking balances."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {assetAccounts.map((account) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="rounded-[1.35rem] border border-border/70 bg-[var(--color-container-inset)] p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {account.type === "property" || account.type === "vehicle" ? (
                        <Landmark className="size-5" />
                      ) : (
                        <Wallet className="size-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                    </div>
                  </div>
                  <StatusPill tone="positive">Asset</StatusPill>
                </div>
                <div className="mt-6 text-2xl font-semibold">
                  <MoneyValue amount={account.balance} currencyCode={account.currencyCode} />
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {account.institutionName ?? "Manual account"} • {account.currencyCode}
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionPanel>

      <SectionPanel title={CLASSIFICATION_LABELS.liability} description="Loans, other liabilities, and credit cards with real card visuals.">
        {liabilityAccounts.length === 0 ? (
          <EmptyState
            title="No liabilities in this view"
            description="Create a loan or credit card account to see debt and statement obligations here."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {liabilityAccounts.map((account) => {
              if (isCreditCardAccount(account)) {
                const creditCard = creditCardsByAccountId[account.id];

                if (!creditCard) {
                  return (
                    <Link
                      key={account.id}
                      href={`/accounts/${account.id}`}
                      className="rounded-[1.35rem] border border-border/70 bg-[var(--color-container-inset)] p-5"
                    >
                      <p className="font-medium">{account.name}</p>
                      <p className="mt-2 text-sm text-muted-foreground">Loading card metadata...</p>
                    </Link>
                  );
                }

                return (
                  <Link key={account.id} href={`/accounts/${account.id}`}>
                    <CreditCardPreview
                      brand={creditCard.brand}
                      last4={creditCard.last4}
                      name={creditCard.name}
                      color={creditCard.color}
                      subtitle={`Closes on ${creditCard.closingDay} • Due on ${creditCard.dueDay}`}
                      balance={<MoneyValue amount={creditCard.balance} currencyCode={creditCard.currencyCode} />}
                    />
                  </Link>
                );
              }

              return (
                <Link
                  key={account.id}
                  href={`/accounts/${account.id}`}
                  className="rounded-[1.35rem] border border-border/70 bg-[var(--color-container-inset)] p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Landmark className="size-5" />
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                      </div>
                    </div>
                    <StatusPill tone="negative">Liability</StatusPill>
                  </div>
                  <div className="mt-6 text-2xl font-semibold">
                    <MoneyValue amount={account.balance} currencyCode={account.currencyCode} />
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {account.institutionName ?? "Manual liability"} • {account.currencyCode}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </SectionPanel>

      <ManualAccountSheet open={accountSheetOpen} onOpenChange={setAccountSheetOpen} />
      <CreditCardFormSheet open={creditCardSheetOpen} onOpenChange={setCreditCardSheetOpen} />
    </div>
  );
}
