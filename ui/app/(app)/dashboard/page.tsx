import Link from "next/link";

import { CreditCardPreview } from "@/components/finance/credit-card-preview";
import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { SegmentedBar } from "@/components/finance/segmented-bar";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Button } from "@/components/ui/button";
import { Typography } from "@/components/ui/typography";
import { formatMonthLabel } from "@/lib/finance";
import {
  budgetSnapshot,
  dashboardAllocation,
  dashboardMetrics,
  recentTransactions,
  showcaseCreditCards,
  showcaseUser,
} from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${showcaseUser.name.split(" ")[0]}`}
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
        {dashboardMetrics.map((metric) => (
          <SummaryCard
            key={metric.label}
            label={metric.label}
            value={typeof metric.amount === "number" ? <MoneyValue amount={metric.amount} currencyCode="BRL" /> : metric.value}
            hint={metric.hint}
            accent={metric.accent}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionPanel
          title="Portfolio balance"
          description="A calm overview of how your money is distributed right now."
          action={
            <StatusPill tone="neutral">
              {formatMonthLabel(budgetSnapshot.month)}
            </StatusPill>
          }
        >
          <div className="space-y-5">
            <SegmentedBar className="h-3" segments={dashboardAllocation} />
            <div className="grid gap-3 md:grid-cols-2">
              {dashboardAllocation.map((segment) => (
                <div key={segment.label} className="rounded-[1.1rem] border border-border/70 bg-[var(--color-container-inset)] p-4">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                    <Typography variant="small-strong">{segment.label}</Typography>
                  </div>
                  <div className="mt-3">
                    <MoneyValue amount={segment.value} currencyCode="BRL" className="text-lg" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Budget runway" description="Static monthly numbers so you can design around real hierarchy.">
          <div className="grid gap-3 md:grid-cols-2">
            <SummaryCard
              label="Income actual"
              value={<MoneyValue amount={budgetSnapshot.incomeActual} currencyCode="BRL" />}
              hint={`Budgeted ${new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(
                budgetSnapshot.incomeBudgeted / 100,
              )}`}
              accent="positive"
            />
            <SummaryCard
              label="Expense actual"
              value={<MoneyValue amount={budgetSnapshot.expenseActual} currencyCode="BRL" />}
              hint={`Budgeted ${new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(
                budgetSnapshot.expenseBudgeted / 100,
              )}`}
              accent="negative"
            />
          </div>

          <div className="mt-5 space-y-3">
            {budgetSnapshot.categories.map((category) => (
              <div key={category.name} className="rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Typography variant="small-strong">{category.name}</Typography>
                  <StatusPill tone={category.tone}>
                    <MoneyValue amount={category.actualAmount} currencyCode="BRL" />
                  </StatusPill>
                </div>
                <div className="mt-3">
                  <SegmentedBar
                    segments={[
                      { label: "Actual", value: category.actualAmount, color: category.color },
                      {
                        label: "Remaining",
                        value: Math.max(category.budgetedAmount - category.actualAmount, 0),
                        color: "#334155",
                      },
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionPanel title="Card moments" description="Beautiful card previews without any billing-state logic.">
          <div className="grid gap-4 lg:grid-cols-2">
            {showcaseCreditCards.map((card) => (
              <CreditCardPreview
                key={card.id}
                brand={card.brand}
                last4={card.last4}
                name={showcaseUser.name}
                color={card.color}
                subtitle={card.statementStatus}
                balance={<MoneyValue amount={card.balance} currencyCode="BRL" className="text-white" />}
              />
            ))}
          </div>
        </SectionPanel>

        <SectionPanel title="Recent activity" description="A representative feed for table, spacing, and tone exploration.">
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                <div className="min-w-0">
                  <Typography variant="small-strong">{transaction.title}</Typography>
                  <Typography variant="small-muted">
                    {transaction.merchant} • {transaction.account} • {transaction.date}
                  </Typography>
                  <Typography variant="small-muted" className="mt-1">
                    {transaction.detail}
                  </Typography>
                </div>
                <div className="text-right">
                  <StatusPill tone={transaction.tone}>{transaction.category}</StatusPill>
                  <MoneyValue amount={transaction.amount} currencyCode="BRL" signed className="mt-2 block text-base" />
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
