import { PageHeader } from "@/components/finance/page-header";
import { SummaryCard } from "@/components/finance/summary-card";
import { SectionPanel } from "@/components/finance/section-panel";
import { Typography } from "@/components/ui/typography";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Reports" />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total income" value="R$15.255,90" hint="-6.3% vs previous period" accent="positive" />
        <SummaryCard label="Total expenses" value="R$6.226,00" hint="-68.9% vs previous period" accent="negative" />
        <SummaryCard label="Net savings" value="R$9.029,90" hint="Income minus expenses" accent="brand" />
      </div>

      <SectionPanel
        title="Reporting canvas"
        description="Detailed report modules can expand here while keeping the same measured panel hierarchy."
      >
        <Typography variant="body-muted" className="max-w-2xl">
          This page is ready for richer charts and comparative analysis without breaking the new black-first system.
        </Typography>
      </SectionPanel>
    </div>
  );
}
