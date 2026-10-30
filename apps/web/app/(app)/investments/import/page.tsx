"use client";

import { InternalPageLayout } from "@/components/finance/internal-page-layout";
import { ExportPanel } from "@/components/investments/export-panel";
import { ImportWizard } from "@/components/investments/import-wizard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportExportPage() {
  return (
    <InternalPageLayout
      title="Import & export"
      subtitle="Bring in a broker statement, or take your investment data with you."
    >
      <Card>
        <CardHeader>
          <CardTitle>Import transactions</CardTitle>
          <CardDescription>
            Nothing is saved until you review the preview. Transactions you already have are flagged
            as duplicates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportWizard />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Download your data as CSV or JSON.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExportPanel />
        </CardContent>
      </Card>
    </InternalPageLayout>
  );
}
