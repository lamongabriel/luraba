"use client";

import type { ImportBatch, ImportFilter, ImportRow } from "@luraba/contracts";
import * as React from "react";
import { KpiCard, KpiGrid } from "@/components/kpi";
import { Button } from "@/components/ui/button";
import { useStartImportMutation } from "@/mutations/imports/use-import-mutations";
import { useDefaultCurrencyCode } from "@/stores/auth-session-store";
import { ImportRowDialog } from "./import-row-dialog";
import { FilterTabs, ImportRowsTable, ROW_FILTERS } from "./import-rows-table";

/** Step 4: the final list. Edit a description, remove a row, then import. */
export function ReviewStep({
  batch,
  onBack,
  onStarted,
}: {
  batch: ImportBatch;
  onBack: () => void;
  onStarted: () => void;
}) {
  const defaultCurrency = useDefaultCurrencyCode();
  const start = useStartImportMutation();
  const [filter, setFilter] = React.useState<ImportFilter>("all");
  const [editing, setEditing] = React.useState<ImportRow | null>(null);
  const { summary } = batch;
  const currency = batch.currencyCode ?? defaultCurrency;
  const skipped = summary.skipped;

  return (
    <div className="space-y-5">
      <KpiGrid columns={4}>
        <KpiCard title="To import" value={summary.ready} />
        <KpiCard title="Already in Luraba" value={summary.duplicates} />
        <KpiCard title="Removed" value={skipped} />
        <KpiCard title="Need a fix" value={summary.invalid} />
      </KpiGrid>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Rows already in Luraba are left out. Fix a row with Edit, or remove it. Rows that need a
          fix are left out when you import.
        </p>
        <FilterTabs value={filter} onChange={setFilter} filters={ROW_FILTERS} />
        <ImportRowsTable
          batchId={batch.id}
          currencyCode={currency}
          filter={filter}
          editable
          onEditRow={setEditing}
        />
      </section>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t bg-background/95 py-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          disabled={start.isPending || summary.ready === 0}
          onClick={() =>
            start.mutate(
              { id: batch.id, body: { skipInvalid: summary.invalid > 0 } },
              { onSuccess: onStarted },
            )
          }
        >
          Import {summary.ready} row{summary.ready === 1 ? "" : "s"}
        </Button>
      </div>
      <ImportRowDialog
        batchId={batch.id}
        row={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
