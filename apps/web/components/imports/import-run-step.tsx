"use client";

import type { ImportBatch, ImportFilter } from "@luraba/contracts";
import * as React from "react";
import { MoneyValue } from "@/components/finance/money-value";
import { KpiCard, KpiGrid } from "@/components/kpi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStartImportMutation } from "@/mutations/imports/use-import-mutations";
import { isImportRunning, useImportReconciliationQuery } from "@/queries/imports/use-imports-query";
import { useDefaultCurrencyCode } from "@/stores/auth-session-store";
import { FilterTabs, ImportRowsTable, RESULT_FILTERS } from "./import-rows-table";

function Reconciliation({ batch }: { batch: ImportBatch }) {
  const defaultCurrency = useDefaultCurrencyCode();
  const query = useImportReconciliationQuery(batch.id, batch.status === "completed");
  const data = query.data;
  if (!data) return null;
  const currency = data.currencyCode ?? defaultCurrency;
  const money = (amount: number | null) =>
    amount === null ? "—" : <MoneyValue amount={amount} currencyCode={currency} />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Does it match Luraba?
          {data.matches === null ? (
            <Badge variant="outline">No balance to compare</Badge>
          ) : data.matches ? (
            <Badge>Balances match</Badge>
          ) : (
            <Badge variant="destructive">Balances differ</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[0.6875rem] text-muted-foreground">
              In the file{data.statement.balanceDate ? ` (${data.statement.balanceDate})` : ""}
            </p>
            <p className="text-sm">{money(data.statement.balance)}</p>
          </div>
          <div>
            <p className="text-[0.6875rem] text-muted-foreground">
              In Luraba{data.targetName ? `: ${data.targetName}` : ""}
            </p>
            <p className="text-sm">{money(data.luraba.balance)}</p>
          </div>
          <div>
            <p className="text-[0.6875rem] text-muted-foreground">Difference</p>
            <p className="text-sm">{money(data.balanceDifference)}</p>
          </div>
        </div>
        {data.openingDifference !== null ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[0.6875rem] text-muted-foreground">
                Balance before the period (file)
              </p>
              <p className="text-sm">{money(data.statement.impliedOpeningBalance)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] text-muted-foreground">
                Balance before the period (Luraba)
              </p>
              <p className="text-sm">{money(data.luraba.openingBalance)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] text-muted-foreground">Missing history</p>
              <p className="text-sm">{money(data.openingDifference)}</p>
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-3 text-xs">
            <p className="mb-1 font-medium">
              File, {data.statement.periodStart} to {data.statement.periodEnd}
            </p>
            <p>
              {data.statement.rowCount} rows · in {money(data.statement.totalIn)} · out{" "}
              {money(data.statement.totalOut)}
            </p>
          </div>
          <div className="rounded-xl border p-3 text-xs">
            <p className="mb-1 font-medium">Luraba, same period</p>
            <p>
              {data.luraba.rowCount} lines · in {money(data.luraba.totalIn)} · out{" "}
              {money(data.luraba.totalOut)}
            </p>
          </div>
        </div>
        <p className="text-xs">
          {data.missingInLuraba} statement row{data.missingInLuraba === 1 ? " has" : "s have"} no
          matching transaction in Luraba (same date and amount). {data.missingInStatement.length}{" "}
          Luraba line{data.missingInStatement.length === 1 ? " is" : "s are"} not in this file.
        </p>
        {data.missingInStatement.length > 0 ? (
          <ul className="space-y-1 text-xs">
            {data.missingInStatement.map((line) => (
              <li
                key={`${line.transactionId}-${line.amount}`}
                className="flex justify-between gap-2 rounded-lg bg-muted/50 px-2 py-1"
              >
                <span className="min-w-0 break-words">
                  {line.date} · {line.description}
                </span>
                <MoneyValue amount={line.amount} currencyCode={currency} signed />
              </li>
            ))}
          </ul>
        ) : null}
        <ul className="space-y-1 text-[0.6875rem] text-muted-foreground">
          {data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/** Step 3: progress while the worker runs, then the result summary, reconciliation and the full result list. */
export function RunStep({ batch, onAnother }: { batch: ImportBatch; onAnother: () => void }) {
  const defaultCurrency = useDefaultCurrencyCode();
  const running = isImportRunning(batch);
  const start = useStartImportMutation();
  const [filter, setFilter] = React.useState<ImportFilter>(
    batch.failedCount > 0 ? "failed" : "all",
  );
  const total = Math.max(batch.rowCount, 1);
  const percent = Math.min(100, Math.round((batch.processedCount / total) * 100));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>
            {batch.status === "queued"
              ? "Waiting for the import worker..."
              : batch.status === "importing"
                ? "Importing..."
                : batch.status === "failed"
                  ? "The import stopped"
                  : "Import finished"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {batch.processedCount} of {batch.rowCount} rows processed. You can leave this page; the
            import keeps running.
          </p>
          {batch.errorMessage ? (
            <p className="text-xs text-destructive">{batch.errorMessage}</p>
          ) : null}
          <KpiGrid columns={4}>
            <KpiCard title="Imported" value={batch.createdCount} />
            <KpiCard title="Already in Luraba" value={batch.duplicateCount} />
            <KpiCard title="Skipped" value={batch.skippedCount} />
            <KpiCard title="Failed" value={batch.failedCount} />
          </KpiGrid>
        </CardContent>
      </Card>

      {!running ? (
        <>
          <Reconciliation batch={batch} />
          <section className="space-y-2">
            <h3 className="text-sm font-medium">Result of every row</h3>
            <FilterTabs value={filter} onChange={setFilter} filters={RESULT_FILTERS} />
            <ImportRowsTable
              batchId={batch.id}
              currencyCode={batch.currencyCode ?? defaultCurrency}
              filter={filter}
              perPage={50}
              editable={false}
            />
          </section>
          <div className="flex flex-wrap justify-between gap-2">
            {batch.failedCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                disabled={start.isPending}
                onClick={() => start.mutate({ id: batch.id, body: { skipInvalid: false } })}
              >
                Retry the {batch.failedCount} failed rows
              </Button>
            ) : (
              <span />
            )}
            <Button type="button" onClick={onAnother}>
              Import another file
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
