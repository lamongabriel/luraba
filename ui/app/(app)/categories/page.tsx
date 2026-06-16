import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { StatusPill } from "@/components/finance/status-pill";
import { Typography } from "@/components/ui/typography";
import { categoryGroups } from "@/lib/mock-data";

export default function CategoriesPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Categories" />

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionPanel title="Income categories" description="Static groups for studying card density and label rhythm.">
          <div className="space-y-3">
            {categoryGroups.income.map((category) => (
              <div key={category.name} className="flex items-center justify-between gap-4 rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                <div>
                  <Typography variant="small-strong">{category.name}</Typography>
                  <Typography variant="small-muted">{category.detail}</Typography>
                </div>
                <StatusPill tone="positive">Income</StatusPill>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel title="Expense categories" description="Representative data so budgets and transactions still feel grounded.">
          <div className="space-y-3">
            {categoryGroups.expense.map((category) => (
              <div key={category.name} className="flex items-center justify-between gap-4 rounded-[1rem] border border-border/70 bg-[var(--color-container-inset)] px-4 py-4">
                <div>
                  <Typography variant="small-strong">{category.name}</Typography>
                  <Typography variant="small-muted">{category.detail}</Typography>
                </div>
                <StatusPill tone="negative">Expense</StatusPill>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
