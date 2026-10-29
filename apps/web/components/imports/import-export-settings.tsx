"use client";

import type { ImportBatch } from "@luraba/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteImportMutation } from "@/mutations/imports/use-import-mutations";
import { useImportQuery } from "@/queries/imports/use-imports-query";
import { ExportPanel } from "./export-panel";
import { ImportHistory } from "./import-history";
import { MapStep } from "./import-map-step";
import { RunStep } from "./import-run-step";
import { UploadDropzone, UploadPreviewStep } from "./import-upload-step";

type Step = 1 | 2 | 3;
const STEP_LABELS = ["Upload", "Review and map", "Import"] as const;

function Stepper({ step }: { step: Step }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Import steps">
      {STEP_LABELS.map((label, index) => (
        <li
          key={label}
          aria-current={step === index + 1 ? "step" : undefined}
          className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${step === index + 1 ? "bg-secondary font-medium" : "text-muted-foreground"}`}
        >
          <span className="font-semibold">{index + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

/** Settings > Import & export: the three-step import wizard and the export downloads. */
export function ImportExportSettings() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const batchId = params.get("batch");
  const [tab, setTab] = React.useState<"import" | "export">("import");
  const [step, setStep] = React.useState<Step>(1);
  const batchQuery = useImportQuery(batchId);
  const batch = batchQuery.data;
  const discard = useDeleteImportMutation();

  const open = React.useCallback(
    (next: ImportBatch | null, nextStep: Step = 1) => {
      setStep(nextStep);
      router.replace(next ? `${pathname}?batch=${next.id}` : pathname);
    },
    [pathname, router],
  );

  // A batch that is already running or finished always shows its result.
  React.useEffect(() => {
    if (batch && batch.status !== "draft") setStep(3);
  }, [batch]);

  const chooseAnother = () => {
    if (batch?.status === "draft") discard.mutate(batch.id);
    open(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex gap-1" role="tablist">
        {(["import", "export"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            variant={tab === value ? "secondary" : "ghost"}
            onClick={() => setTab(value)}
          >
            {value === "import" ? "Import" : "Export"}
          </Button>
        ))}
      </div>

      {tab === "export" ? (
        <ExportPanel />
      ) : !batchId ? (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            Import a bank or credit card statement, check it against what Luraba already has, and
            flag what doesn't match. Re-importing the same file never creates duplicates.
          </p>
          <UploadDropzone onUploaded={(created) => open(created, 1)} />
          <ImportHistory onOpen={(item) => open(item, item.status === "draft" ? 2 : 3)} />
        </div>
      ) : batchQuery.isPending || !batch ? (
        <Skeleton className="h-72" />
      ) : (
        <div className="space-y-5">
          <Stepper step={step} />
          {step === 1 && batch.status === "draft" ? (
            <UploadPreviewStep
              batch={batch}
              onNext={() => setStep(2)}
              onChooseAnother={chooseAnother}
            />
          ) : null}
          {step === 2 && batch.status === "draft" ? (
            <MapStep batch={batch} onBack={() => setStep(1)} onStarted={() => setStep(3)} />
          ) : null}
          {step === 3 || batch.status !== "draft" ? (
            <RunStep batch={batch} onAnother={() => open(null)} />
          ) : null}
        </div>
      )}
    </div>
  );
}
