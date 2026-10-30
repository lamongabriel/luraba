"use client";

import { type ImportBatch, PERMISSIONS } from "@luraba/contracts";
import { useCan } from "@/components/permissions/use-can";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteImportMutation } from "@/mutations/imports/use-import-mutations";
import { isImportRunning, useImportsQuery } from "@/queries/imports/use-imports-query";
import { SOURCE_KIND_LABELS } from "./import-status";

const STATUS_LABEL: Record<ImportBatch["status"], string> = {
  draft: "In progress",
  queued: "Queued",
  importing: "Importing",
  completed: "Finished",
  failed: "Stopped",
};

export function ImportHistory({ onOpen }: { onOpen: (batch: ImportBatch) => void }) {
  const query = useImportsQuery({ perPage: 10 });
  const remove = useDeleteImportMutation();
  const canDelete = useCan()(PERMISSIONS.IMPORTS_DELETE);
  const batches = query.data?.data ?? [];
  if (batches.length === 0) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium">Earlier imports</h3>
      <ul className="divide-y rounded-xl border">
        {batches.map((batch) => (
          <li
            key={batch.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium break-words">{batch.fileName}</p>
              <p className="text-[0.6875rem] text-muted-foreground">
                {SOURCE_KIND_LABELS[batch.sourceKind]} · {batch.rowCount} rows
                {batch.status === "completed"
                  ? ` · ${batch.createdCount} imported, ${batch.duplicateCount} duplicates, ${batch.failedCount} failed`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={batch.status === "failed" ? "destructive" : "outline"}>
                {STATUS_LABEL[batch.status]}
              </Badge>
              <Button type="button" size="sm" variant="ghost" onClick={() => onOpen(batch)}>
                {batch.status === "draft" ? "Continue" : "View"}
              </Button>
              {canDelete ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isImportRunning(batch) || remove.isPending}
                  onClick={() => remove.mutate(batch.id)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Removing an import only deletes its staging data. Transactions it created stay in Luraba.
      </p>
    </section>
  );
}
