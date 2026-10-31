import { Suspense } from "react";
import { ImportWizard } from "@/components/imports/import-wizard";
import { SectionCard } from "@/components/section/section-card";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Import",
  description: "Import transactions from bank statements.",
  path: "/household/import",
});

export default function HouseholdImportPage() {
  return (
    <SectionCard
      title="Import"
      description="Bring in transactions from a statement: CSV, Excel or OFX."
    >
      <Suspense>
        <ImportWizard />
      </Suspense>
    </SectionCard>
  );
}
