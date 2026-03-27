"use client";

import Link from "next/link";
import { ArrowRightLeft, CreditCard, Landmark, ReceiptText, Wallet } from "lucide-react";

import { EmptyState } from "@/components/finance/empty-state";
import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { SegmentedBar } from "@/components/finance/segmented-bar";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Button } from "@/components/ui/button";
import { ACCOUNT_TYPE_LABELS, getCurrentMonthKey, sumAccountBalances } from "@/lib/finance";
import { useAccountsQuery } from "@/queries/use-accounts.query";
import { useBudgetQuery } from "@/queries/use-budget.query";
import { useCreditCardsQuery } from "@/queries/use-credit-cards.query";
import { useTransactionsQuery } from "@/queries/use-transactions.query";
import { useAuthStore } from "@/stores/auth.store";

const ACCOUNT_GROUP_COLORS = ["#0891b2", "#0f766e", "#d97706", "#7c3aed", "#2563eb", "#db2777"];

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const month = getCurrentMonthKey();

  const { data: accounts = [], isLoading: accountsLoading } = useAccountsQuery();
  const { data: creditCards = [] } = useCreditCardsQuery();
  const { data: transactions = [] } = useTransactionsQuery();
  const { data: budget } = useBudgetQuery(month, user?.preferences.currency);

  const assets = sumAccountBalances(accounts, "asset");
  const liabilities = sumAccountBalances(accounts, "liability");
  const netWorth = assets - liabilities;
  const recentTransactions = [...transactions]
    .sort((left, right) => right.postedDate.localeCompare(left.postedDate))
    .slice(0, 5);

  const groupedAccounts = Object.values(
    accounts.reduce<Record<string, { label: string; balance: number; color: string }>>((groups, account, index) => {
      const current = groups[account.type];
      if (current) {
        current.balance += account.balance;
        return groups;
      }

      groups[account.type] = {
        label: ACCOUNT_TYPE_LABELS[account.type],
        balance: account.balance,
        color: ACCOUNT_GROUP_COLORS[index % ACCOUNT_GROUP_COLORS.length],
      };
      return groups;
    }, {}),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name ?? "there"}`}
        description="Track assets, liabilities, budgets, and card obligations with the same mental model you use in a real banking app."
        actions={
          <>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/transactions">Review transactions</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href="/accounts">Open accounts</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard
          label="Assets"
          value={<MoneyValue amount={assets} currencyCode={user?.preferences.currency ?? "BRL"} />}
          hint={`${accounts.filter((account) => account.classification === "asset").length} asset accounts`}
          accent="positive"
        />
        <SummaryCard
          label="Liabilities"
          value={<MoneyValue amount={liabilities} currencyCode={user?.preferences.currency ?? "BRL"} />}
          hint={`${accounts.filter((account) => account.classification === "liability").length} liability accounts`}
          accent="negative"
        />
        <SummaryCard
          label="Net position"
          value={<MoneyValue amount={netWorth} currencyCode={user?.preferences.currency ?? "BRL"} />}
          hint="Assets minus liabilities"
          accent="brand"
        />
        <SummaryCard
          label="This month"
          value={
            budget ? (
              <MoneyValue
                amount={budget.totals.incomeActual - budget.totals.expenseActual}
                currencyCode={budget.currencyCode}
              />
            ) : (
              "Loading..."
            )
          }
          hint="Current month budget actuals"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionPanel
          title="Balance sheet"
          description="See how your account types stack up across assets and liabilities."
          action={
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/accounts">View all accounts</Link>
            </Button>
          }
        >
          {accountsLoading ? (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          ) : accounts.length === 0 ? (
            <EmptyState
              title="No accounts yet"
              description="Create a depository, loan, property, or credit card account to start building the workspace."
              action={
                <Button asChild>
                  <Link href="/accounts">Create your first account</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              <SegmentedBar
                className="h-3"
                segments={groupedAccounts.map((group) => ({
                  label: group.label,
                  value: Math.abs(group.balance),
                  color: group.color,
                }))}
              />
              <div className="grid gap-3 md:grid-cols-2">
                {groupedAccounts.map((group) => (
                  <div key={group.label} className="rounded-[1.1rem] border border-border/70 bg-[var(--color-container-inset)] p-4">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                      <p className="font-medium">{group.label}</p>
                    </div>
                    <div className="mt-2 text-lg font-semibold">
                      <MoneyValue amount={group.balance} currencyCode={user?.preferences.currency ?? "BRL"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionPanel>

        <SectionPanel title="Month budget snapshot" description="Budgeted and actual totals for the current month.">
          {budget ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <SummaryCard
                  label="Income actual"
                  value={<MoneyValue amount={budget.totals.incomeActual} currencyCode={budget.currencyCode} />}
                  hint={
                    <>
                      Budgeted <MoneyValue amount={budget.totals.incomeBudgeted} currencyCode={budget.currencyCode} />
                    </>
                  }
                  accent="positive"
                />
                <SummaryCard
                  label="Expense actual"
                  value={<MoneyValue amount={budget.totals.expenseActual} currencyCode={budget.currencyCode} />}
                  hint={
                    <>
                      Budgeted <MoneyValue amount={budget.totals.expenseBudgeted} currencyCode={budget.currencyCode} />
                    </>
                  }
                  accent="negative"
                />
              </div>

              <div className="space-y-3">
                {budget.categories.expense.slice(0, 4).map((category) => (
                  <div key={category.categoryId} className="flex items-center justify-between rounded-[1rem] bg-[var(--color-container-inset)] px-4 py-3">
                    <div>
                      <p className="font-medium">{category.categoryName}</p>
                      <p className="text-xs text-muted-foreground">
                        Budgeted <MoneyValue amount={category.budgetedAmount} currencyCode={budget.currencyCode} />
                      </p>
                    </div>
                    <StatusPill tone={category.actualAmount > category.budgetedAmount ? "negative" : "positive"}>
                      <MoneyValue amount={category.actualAmount} currencyCode={budget.currencyCode} />
                    </StatusPill>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Loading budget snapshot...</p>
          )}
        </SectionPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <SectionPanel
          title="Upcoming card obligations"
          description="Track current credit card balances and their billing cadence."
          action={
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/accounts">Manage cards</Link>
            </Button>
          }
        >
          {creditCards.length === 0 ? (
            <EmptyState
              title="No credit cards yet"
              description="Add a credit card account to start tracking statements, future installments, and payments."
            />
          ) : (
            <div className="space-y-3">
              {creditCards.map((card) => (
                <Link
                  key={card.id}
                  href={`/accounts/${card.accountId}`}
                  className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4 transition hover:border-primary/40 hover:bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CreditCard className="size-5" />
                    </div>
                    <div>
                      <p className="font-medium">{card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Closing day {card.closingDay} • Due day {card.dueDay}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      <MoneyValue amount={card.balance} currencyCode={card.currencyCode} />
                    </div>
                    {card.unappliedCreditAmount > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Credit <MoneyValue amount={card.unappliedCreditAmount} currencyCode={card.currencyCode} />
                      </p>
                    ) : null}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionPanel>

        <SectionPanel
          title="Recent activity"
          description="Latest posted activity across your accounts and cards."
          action={
            <Button asChild variant="ghost" className="rounded-full">
              <Link href="/transactions">Open transactions</Link>
            </Button>
          }
        >
          {recentTransactions.length === 0 ? (
            <EmptyState title="No activity yet" description="Create a transaction or a card purchase to start building the activity feed." />
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      {transaction.type === "transfer" ? (
                        <ArrowRightLeft className="size-4" />
                      ) : transaction.type === "income" ? (
                        <Wallet className="size-4" />
                      ) : transaction.type === "adjustment" ? (
                        <Landmark className="size-4" />
                      ) : (
                        <ReceiptText className="size-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.accountName ?? transaction.toAccountName ?? "No account"} • {transaction.postedDate}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      <MoneyValue amount={transaction.amount} currencyCode={transaction.currencyCode} />
                    </div>
                    <StatusPill tone={transaction.type === "income" ? "positive" : transaction.type === "expense" ? "negative" : "neutral"}>
                      {transaction.type}
                    </StatusPill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>
    </div>
  );
}
