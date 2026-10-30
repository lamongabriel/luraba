"use client";

import { type ImportBatch, PERMISSIONS } from "@luraba/contracts";
import * as React from "react";
import { useCan } from "@/components/permissions/use-can";
import { DataBoundary, TableSkeleton } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useUploadImportMutation } from "@/mutations/imports/use-import-mutations";
import { useImportPreviewQuery } from "@/queries/imports/use-imports-query";
import { AccountPicker, CreditCardPicker } from "./import-pickers";
import { ImportRawTable, PREVIEW_ROWS } from "./import-raw-table";

const ACCEPT = ".csv,.tsv,.txt,.xlsx,.ofx,.qfx";

/** Step 1, before a file exists: choose where the transactions go, then drop the file. */
export function UploadStep({ onUploaded }: { onUploaded: (batch: ImportBatch) => void }) {
  const upload = useUploadImportMutation();
  const canImport = useCan()(PERMISSIONS.IMPORTS_CREATE);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [kind, setKind] = React.useState<"account" | "credit_card">("account");
  const [accountId, setAccountId] = React.useState<string | null>(null);
  const [creditCardId, setCreditCardId] = React.useState<string | null>(null);
  const targetId = kind === "account" ? accountId : creditCardId;

  const send = (file: File | undefined) => {
    if (!file || !targetId) return;
    upload.mutate(
      { file, target: kind === "account" ? { accountId: targetId } : { creditCardId: targetId } },
      { onSuccess: onUploaded },
    );
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="import-target">Where should these transactions go?</Label>
        <div className="flex gap-1" role="tablist" aria-label="Destination type">
          {(
            [
              ["account", "Account"],
              ["credit_card", "Credit card"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              type="button"
              role="tab"
              aria-selected={kind === value}
              size="sm"
              variant={kind === value ? "secondary" : "ghost"}
              onClick={() => setKind(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="max-w-md">
          {kind === "account" ? (
            <AccountPicker id="import-target" value={accountId} onChange={setAccountId} />
          ) : (
            <CreditCardPicker id="import-target" value={creditCardId} onChange={setCreditCardId} />
          )}
        </div>
      </div>

      <div className="space-y-2">
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
          className={`flex w-full flex-col items-center gap-1 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60 ${dragging ? "bg-muted/60" : ""}`}
          disabled={upload.isPending || !targetId || !canImport}
        >
          <span className="text-sm font-medium">
            {upload.isPending
              ? "Reading the file..."
              : !canImport
                ? "You don't have permission to import files"
                : targetId
                  ? "Drop a file here"
                  : "Choose the destination first"}
          </span>
          <span className="text-xs text-muted-foreground">
            CSV, Excel (.xlsx) or OFX. Click to browse.
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          aria-label="Import file"
          onChange={(event) => {
            send(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/** Step 1, after upload: the file as written. Nothing is guessed or mapped yet. */
export function UploadPreviewStep({
  batch,
  onNext,
  onChooseAnother,
}: {
  batch: ImportBatch;
  onNext: () => void;
  onChooseAnother: () => void;
}) {
  const preview = useImportPreviewQuery(batch.id, PREVIEW_ROWS);
  const data = preview.data;
  return (
    <div className="space-y-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium break-words">{batch.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {batch.parserLabel}
          {data ? ` · ${data.totalRows} rows` : ""}
          {batch.format === "statement" && batch.institution ? ` · ${batch.institution}` : ""}
          {batch.format === "statement" && batch.periodStart && batch.periodEnd
            ? ` · ${batch.periodStart} to ${batch.periodEnd}`
            : ""}
        </p>
      </div>
      {batch.warnings.length > 0 ? (
        <ul className="space-y-1 text-xs text-amber-600 dark:text-amber-400">
          {batch.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <DataBoundary
        isPending={preview.isPending}
        isError={preview.isError}
        error={preview.error}
        onRetry={() => void preview.refetch()}
        errorTitle="Couldn't read the file preview"
        loading={<TableSkeleton columns={5} rows={PREVIEW_ROWS} label="Loading the file" />}
      >
        {data ? (
          <div className="space-y-2">
            <ImportRawTable headers={data.headers} rows={data.rows} />
            <p className="text-xs text-muted-foreground">
              {data.totalRows > data.rows.length
                ? `The first ${data.rows.length} of ${data.totalRows} rows, exactly as written.`
                : "Every row, exactly as written."}
            </p>
          </div>
        ) : null}
      </DataBoundary>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onChooseAnother}>
          Choose another file
        </Button>
        <Button type="button" onClick={onNext}>
          {batch.format === "table" ? "Next: map columns" : "Next: map values"}
        </Button>
      </div>
    </div>
  );
}
