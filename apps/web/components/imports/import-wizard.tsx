"use client";

import type { ImportBatch } from "@luraba/contracts";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { CardSkeleton, DataBoundary } from "@/components/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper, type StepperStep } from "@/components/ui/stepper";
import { useDeleteImportMutation } from "@/mutations/imports/use-import-mutations";
import { useImportQuery } from "@/queries/imports/use-imports-query";
import { ColumnsStep } from "./import-columns-step";
import { ImportHistory } from "./import-history";
import { ReviewStep } from "./import-review-step";
import { RunStep } from "./import-run-step";
import { UploadPreviewStep, UploadStep } from "./import-upload-step";
import { ValuesStep } from "./import-values-step";

type Step = 1 | 2 | 3 | 4 | 5;

function stepsFor(batch: ImportBatch | undefined): StepperStep[] {
  const fixed = batch?.format === "statement";
  return [
    { id: "upload", label: "Upload" },
    {
      id: "columns",
      label: "Columns",
      description: fixed ? "Fixed fields" : undefined,
      disabled: fixed,
    },
    { id: "values", label: "Values" },
    { id: "review", label: "Review" },
    { id: "import", label: "Import" },
  ];
}

/** Where a saved draft should reopen: the first step that still needs the user. */
function resumeStep(batch: ImportBatch): Step {
  if (batch.status !== "draft") return 5;
  return batch.format === "table" && !batch.columnMapping ? 1 : 3;
}

/**
 * The import wizard: Upload, Columns, Values, Review, Import. The batch id lives in the URL so a
 * reload or a visit from the history resumes the draft; a started batch always shows step 5.
 */
export function ImportWizard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const batchId = params.get("batch");
  const [step, setStep] = React.useState<Step>(1);
  const batchQuery = useImportQuery(batchId);
  const batch = batchQuery.data;
  const discard = useDeleteImportMutation();
  const initialised = React.useRef<string | null>(null);

  const open = React.useCallback(
    (next: ImportBatch | null, nextStep: Step = 1) => {
      initialised.current = next?.id ?? null;
      setStep(nextStep);
      router.replace(next ? `${pathname}?batch=${next.id}` : pathname);
    },
    [pathname, router],
  );

  React.useEffect(() => {
    if (!batch || initialised.current === batch.id) return;
    initialised.current = batch.id;
    setStep(resumeStep(batch));
  }, [batch]);

  // A batch that was started always shows its progress or result.
  React.useEffect(() => {
    if (batch && batch.status !== "draft") setStep(5);
  }, [batch]);

  if (!batchId) {
    return (
      <div className="space-y-6">
        <Stepper steps={stepsFor(undefined)} current={0} label="Import steps" />
        <UploadStep onUploaded={(created) => open(created, 1)} />
        <ImportHistory
          onOpen={(item) => open(item, item.status === "draft" ? resumeStep(item) : 5)}
        />
      </div>
    );
  }

  const chooseAnother = () => {
    if (batch?.status === "draft") discard.mutate(batch.id);
    open(null);
  };
  const isTable = batch?.format === "table";

  return (
    <div className="space-y-6">
      <Stepper
        steps={stepsFor(batch)}
        current={step - 1}
        onSelect={(index) => setStep((index + 1) as Step)}
        label="Import steps"
      />
      <DataBoundary
        isPending={batchQuery.isPending}
        isError={batchQuery.isError}
        error={batchQuery.error}
        onRetry={() => void batchQuery.refetch()}
        errorTitle="Couldn't load this import"
        loading={
          <CardSkeleton>
            <Skeleton className="h-72" />
          </CardSkeleton>
        }
      >
        {batch ? (
          <>
            {step === 1 && batch.status === "draft" ? (
              <UploadPreviewStep
                batch={batch}
                onNext={() => setStep(isTable ? 2 : 3)}
                onChooseAnother={chooseAnother}
              />
            ) : null}
            {step === 2 && batch.status === "draft" ? (
              <ColumnsStep batch={batch} onBack={() => setStep(1)} onNext={() => setStep(3)} />
            ) : null}
            {step === 3 && batch.status === "draft" ? (
              <ValuesStep
                batch={batch}
                onBack={() => setStep(isTable ? 2 : 1)}
                onNext={() => setStep(4)}
              />
            ) : null}
            {step === 4 && batch.status === "draft" ? (
              <ReviewStep batch={batch} onBack={() => setStep(3)} onStarted={() => setStep(5)} />
            ) : null}
            {step === 5 || batch.status !== "draft" ? (
              <RunStep batch={batch} onAnother={() => open(null)} />
            ) : null}
          </>
        ) : null}
      </DataBoundary>
    </div>
  );
}
