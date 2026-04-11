"use client";

import * as React from "react";
import Link from "next/link";
import {
  Add01Icon,
  ArrowLeftRightIcon,
  Search01Icon,
  SlidersHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { EmptyState } from "@/components/finance/empty-state";
import { TransactionFormSheet } from "@/components/finance/forms/transaction-form-sheet";
import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Typography } from "@/components/ui/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRANSACTION_TYPE_LABELS } from "@/lib/finance";
import { useAccountsQuery } from "@/queries/use-accounts.query";
import { useCategoriesQuery } from "@/queries/use-categories.query";
import { useTransactionsQuery } from "@/queries/use-transactions.query";
import { useAuthStore } from "@/stores/auth.store";

export default function TransactionsPage() {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<"all" | "expense" | "income" | "transfer" | "adjustment">("all");
  const preferredCurrency = useAuthStore((state) => state.user?.preferences.currency ?? "BRL");

  const { data: transactions = [], isLoading, isError } = useTransactionsQuery();
  const { data: accounts = [] } = useAccountsQuery();
  const { data: categories = [] } = useCategoriesQuery();

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesType = type === "all" ? true : transaction.type === type;
    const searchValue = query.trim().toLowerCase();
    const matchesQuery =
      searchValue.length === 0
        ? true
        : [transaction.description, transaction.accountName, transaction.toAccountName, transaction.paymentMethodName]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(searchValue));

    return matchesType && matchesQuery;
  });

  const totals = filteredTransactions.reduce(
    (accumulator, transaction) => {
      if (transaction.type === "income") accumulator.income += transaction.amount;
      if (transaction.type === "expense") accumulator.expense += transaction.amount;
      if (transaction.type === "transfer") accumulator.transfers += 1;
      return accumulator;
    },
    { income: 0, expense: 0, transfers: 0 },
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Transactions"
        actions={
          <Button className="rounded-full" onClick={() => setSheetOpen(true)}>
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            New transaction
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <SummaryCard label="Transactions" value={filteredTransactions.length} hint="Current filtered result" />
        <SummaryCard
          label="Income"
          value={<MoneyValue amount={totals.income} currencyCode={preferredCurrency} />}
          hint="Filtered income total"
          accent="positive"
        />
        <SummaryCard
          label="Expenses"
          value={<MoneyValue amount={totals.expense} currencyCode={preferredCurrency} />}
          hint="Filtered expense total"
          accent="negative"
        />
        <SummaryCard label="Transfers" value={totals.transfers} hint="Transfer rows in the current view" />
      </div>

      <SectionPanel title="Filters" description="Search by description, account, or payment method.">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="space-y-2">
            <Label htmlFor="transactions-search">Search</Label>
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                strokeWidth={2}
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="transactions-search"
                className="pl-9"
                placeholder="Search transactions..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value: typeof type) => setType(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All transactions</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel
        title="Latest transactions"
        description="Amounts are displayed using the API’s integer money fields."
        action={
          <Typography as="div" variant="small-muted" className="flex items-center gap-2">
            <HugeiconsIcon icon={SlidersHorizontalIcon} strokeWidth={2} className="size-4" />
            {filteredTransactions.length} row(s)
          </Typography>
        }
      >
        {isLoading ? <Typography variant="body-muted">Loading transactions...</Typography> : null}
        {isError ? <Typography variant="small-destructive">Failed to load transactions.</Typography> : null}

        {!isLoading && filteredTransactions.length === 0 ? (
          <EmptyState
            title="No transactions in this view"
            description="Adjust your filters or create a new transaction to start filling the ledger."
          />
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-4 rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4 md:grid-cols-[1.3fr_0.8fr_0.55fr_0.55fr]"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Typography variant="small-strong">{transaction.description}</Typography>
                    <StatusPill
                      tone={
                        transaction.type === "income"
                          ? "positive"
                          : transaction.type === "expense"
                            ? "negative"
                            : "neutral"
                      }
                    >
                      {TRANSACTION_TYPE_LABELS[transaction.type]}
                    </StatusPill>
                  </div>
                  <Typography className="mt-1" variant="small-muted">
                    {transaction.accountName ?? "No account"}
                    {transaction.type === "transfer" && transaction.toAccountName ? ` → ${transaction.toAccountName}` : ""}
                  </Typography>
                </div>

                <div>
                  <Typography variant="meta">Category / method</Typography>
                  <Typography className="mt-1">
                    {transaction.paymentMethodName ?? "No payment method"}
                  </Typography>
                </div>

                <div>
                  <Typography variant="meta">Date</Typography>
                  <Typography className="mt-1">{transaction.postedDate}</Typography>
                </div>

                <div className="text-left md:text-right">
                  <Typography variant="meta">Amount</Typography>
                  <div className="mt-1 text-sm font-semibold">
                    <MoneyValue amount={transaction.amount} currencyCode={transaction.currencyCode} />
                  </div>
                  <div className="mt-2">
                    {transaction.accountId ? (
                      <Button asChild variant="ghost" size="sm" className="rounded-full">
                        <Link href={`/accounts/${transaction.accountId}`}>
                          Open account
                          {transaction.type === "transfer" ? (
                            <HugeiconsIcon icon={ArrowLeftRightIcon} strokeWidth={2} className="size-4" />
                          ) : null}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>

      <TransactionFormSheet open={sheetOpen} onOpenChange={setSheetOpen} accounts={accounts} categories={categories} />
    </div>
  );
}
