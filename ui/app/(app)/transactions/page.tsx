import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { TransactionFilterForm } from "@/components/transaction-filter-form";
import { Typography } from "@/components/ui/typography";
import { transactionFeed } from "@/lib/mock-data";

export default function TransactionsPage() {
  const inflow = transactionFeed.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  const outflow = Math.abs(transactionFeed.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0));

  return (
    <div className="space-y-8">
      <PageHeader title="Transactions" />

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryCard label="Inflow" value={<MoneyValue amount={inflow} currencyCode="BRL" />} hint="Positive entries in the current feed" accent="positive" />
        <SummaryCard label="Outflow" value={<MoneyValue amount={outflow} currencyCode="BRL" />} hint="Negative entries in the current feed" accent="negative" />
        <SummaryCard label="Visible rows" value={transactionFeed.length.toString()} hint="A static table for UI iteration" accent="neutral" />
      </div>

      <SectionPanel title="Filter strip" description="A visual-only control row for search, segmentation, and action placement.">
        <TransactionFilterForm />
      </SectionPanel>

      <SectionPanel title="Activity feed" description="Representative transaction cards without query state, loading spinners, or schema checks.">
        <div className="space-y-3">
          {transactionFeed.map((transaction) => (
            <div key={transaction.id} className="grid gap-3 rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4 md:grid-cols-[1.2fr_0.8fr_auto] md:items-center">
              <div className="min-w-0">
                <Typography variant="small-strong">{transaction.title}</Typography>
                <Typography variant="small-muted">
                  {transaction.merchant} • {transaction.account}
                </Typography>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone={transaction.tone}>{transaction.category}</StatusPill>
                <StatusPill tone="neutral">{transaction.status}</StatusPill>
              </div>
              <div className="text-right">
                <MoneyValue amount={transaction.amount} currencyCode="BRL" signed className="text-base" />
                <Typography variant="small-muted">{transaction.date}</Typography>
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>
    </div>
  );
}
