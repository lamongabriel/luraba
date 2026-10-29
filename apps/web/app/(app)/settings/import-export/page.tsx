import { Suspense } from "react";
import { ImportExportSettings } from "@/components/imports/import-export-settings";

export default function ImportExportSettingsPage() {
  return (
    <Suspense>
      <ImportExportSettings />
    </Suspense>
  );
}
