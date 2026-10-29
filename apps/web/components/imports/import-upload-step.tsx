"use client";

import type { ImportBatch } from "@luraba/contracts";
import * as React from "react";
import { MoneyValue } from "@/components/finance/money-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUploadImportMutation } from "@/mutations/imports/use-import-mutations";
import { useImportParsersQuery } from "@/queries/imports/use-imports-query";
import { useDefaultCurrencyCode } from "@/stores/auth-session-store";
import { ImportRowsTable } from "./import-rows-table";
import { SOURCE_KIND_LABELS } from "./import-status";

export function UploadDropzone({ onUploaded }: { onUploaded: (batch: ImportBatch) => void }) {
  const upload = useUploadImportMutation();
  const parsers = useImportParsersQuery();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const send = (file: File | undefined) => {
    if (file) upload.mutate({ file }, { onSuccess: onUploaded });
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          send(event.dataTransfer.files[0]);
        }}
        className={`flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors hover:bg-muted/50 ${dragging ? "bg-muted/60" : ""}`}
        disabled={upload.isPending}
      >
        <span className="text-sm font-medium">
          {upload.isPending ? "Reading the file..." : "Drop a bank or credit card statement here"}
        </span>
        <span className="text-xs text-muted-foreground">or click to choose a file</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".ofx,.qfx,.csv"
        className="sr-only"
        aria-label="Statement file"
        onChange={(event) => {
          send(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {parsers.data ? (
        <p className="text-xs text-muted-foreground">
          Supported: {parsers.data.map((parser) => parser.label).join(", ")}. Other formats can be
          added as new adapters.
        </p>
      ) : null}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[0.6875rem] text-muted-foreground">{label}</dt>
      <dd className="text-xs">{children}</dd>
    </div>
  );
}

/** Step 1: what was detected in the file plus its first rows, to confirm it is the right one. */
export function UploadPreviewStep({
  batch,
  onNext,
  onChooseAnother,
}: {
  batch: ImportBatch;
  onNext: () => void;
  onChooseAnother: () => void;
}) {
  const defaultCurrency = useDefaultCurrencyCode();
  const currency = batch.currencyCode ?? defaultCurrency;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {batch.fileName}
            <Badge variant="secondary">{SOURCE_KIND_LABELS[batch.sourceKind]}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Detected format">{batch.parserLabel}</Fact>
            <Fact label="Institution">{batch.institution ?? "Unknown"}</Fact>
            <Fact label="Account in file">{batch.sourceAccountRef ?? "Not stated"}</Fact>
            <Fact label="Rows">{batch.rowCount}</Fact>
            <Fact label="Period">
              {batch.periodStart && batch.periodEnd
                ? `${batch.periodStart} to ${batch.periodEnd}`
                : "Not stated"}
            </Fact>
            <Fact label="Currency">{currency}</Fact>
            <Fact
              label={
                batch.sourceKind === "credit_card"
                  ? "Amount owed in file"
                  : "Closing balance in file"
              }
            >
              {batch.statementBalance === null ? (
                "Not stated"
              ) : (
                <MoneyValue amount={batch.statementBalance} currencyCode={currency} />
              )}
            </Fact>
            <Fact label="Balance date">{batch.statementBalanceDate ?? "—"}</Fact>
          </dl>
          {batch.warnings.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs text-amber-600 dark:text-amber-400">
              {batch.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-xs font-medium">First rows</h3>
        <PreviewRows batchId={batch.id} currencyCode={currency} />
        <p className="text-xs text-muted-foreground">
          The bank's own descriptions are shown as written. You will map them to Luraba merchants in
          the next step.
        </p>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onChooseAnother}>
          Choose another file
        </Button>
        <Button type="button" onClick={onNext}>
          Next: review and map
        </Button>
      </div>
    </div>
  );
}

function PreviewRows({ batchId, currencyCode }: { batchId: string; currencyCode: string }) {
  return (
    <ImportRowsTable
      batchId={batchId}
      currencyCode={currencyCode}
      filter="all"
      perPage={8}
      editable={false}
    />
  );
}
