import { PageHeader } from "@/components/finance/page-header";
import { SectionPanel } from "@/components/finance/section-panel";
import { SummaryCard } from "@/components/finance/summary-card";
import { Typography } from "@/components/ui/typography";
import { reportHighlights } from "@/lib/mock-data";

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Reports" />

      <div className="grid gap-4 md:grid-cols-3">
        {reportHighlights.map((item, index) => (
          <SummaryCard
            key={item.label}
            label={item.label}
            value={item.value}
            hint={item.hint}
            accent={index === 0 ? "brand" : index === 1 ? "positive" : "neutral"}
          />
        ))}
      </div>

      <SectionPanel title="Reporting canvas" description="A flexible surface for charts, comparisons, and future analytical modules.">
        <Typography variant="body-muted" className="max-w-2xl">
          This page is intentionally static so you can experiment with chart shells, comparison cards, date headers,
          and commentary blocks before reconnecting any report generation logic.
        </Typography>
      </SectionPanel>
    </div>
  );
}
