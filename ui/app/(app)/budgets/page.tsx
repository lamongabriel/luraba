import { MoneyValue } from "@/components/finance/money-value";
import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { SegmentedBar } from "@/components/finance/segmented-bar";
import { StatusPill } from "@/components/finance/status-pill";
import { SummaryCard } from "@/components/finance/summary-card";
import { Typography } from "@/components/ui/typography";
import { budgetSnapshot } from "@/lib/mock-data";
import { formatMonthLabel } from "@/lib/finance";

export default function BudgetsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Budgets" actions={<StatusPill tone="neutral">{formatMonthLabel(budgetSnapshot.month)}</StatusPill>} />

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryCard
          label="Income plan"
          value={<MoneyValue amount={budgetSnapshot.incomeBudgeted} currencyCode="BRL" />}
          hint="Target for the current month"
          accent="positive"
        />
        <SummaryCard
          label="Expense plan"
          value={<MoneyValue amount={budgetSnapshot.expenseBudgeted} currencyCode="BRL" />}
          hint="Allocated spend across categories"
          accent="negative"
        />
        <SummaryCard
          label="Expected remainder"
          value={<MoneyValue amount={budgetSnapshot.incomeBudgeted - budgetSnapshot.expenseBudgeted} currencyCode="BRL" />}
          hint="Useful for hierarchy and contrast tuning"
          accent="brand"
        />
      </div>

      <SectionPanel title="Category performance" description="Design a strong budget table without waiting on monthly endpoints.">
        <div className="space-y-4">
          {budgetSnapshot.categories.map((category) => (
            <div key={category.name} className="rounded-[1.15rem] border border-border/70 bg-[var(--color-container-inset)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Typography variant="small-strong">{category.name}</Typography>
                  <Typography variant="small-muted">
                    Budgeted <MoneyValue amount={category.budgetedAmount} currencyCode="BRL" />
                  </Typography>
                </div>
                <StatusPill tone={category.tone}>
                  <MoneyValue amount={category.actualAmount} currencyCode="BRL" />
                </StatusPill>
              </div>
              <div className="mt-4">
                <SegmentedBar
                  className="h-3"
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
  );
}
