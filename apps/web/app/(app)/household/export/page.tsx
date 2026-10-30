import { ExportPanel } from "@/components/imports/export-panel";
import { SectionCard } from "@/components/section/section-card";

export default function HouseholdExportPage() {
  return (
    <SectionCard title="Export" description="Download your household data.">
      <ExportPanel />
    </SectionCard>
  );
}
