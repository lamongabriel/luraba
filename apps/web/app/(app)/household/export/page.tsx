import { ExportPanel } from "@/components/imports/export-panel";
import { SectionCard } from "@/components/section/section-card";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Export",
  description: "Download your household data.",
  path: "/household/export",
});

export default function HouseholdExportPage() {
  return (
    <SectionCard title="Export" description="Download your household data.">
      <ExportPanel />
    </SectionCard>
  );
}
