"use client";

import type {
  ImportBatch,
  ImportFilter,
  ImportGroup,
  ImportMapping,
  ImportRow,
} from "@luraba/contracts";
import * as React from "react";
import { AmountDisplay } from "@/components/display";
import { CategorySelectControl } from "@/components/forms/form-category-select";
import { TagSelectControl } from "@/components/forms/form-tag-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useSaveImportMappingMutation,
  useStartImportMutation,
  useUpdateImportMutation,
  useUpdateImportRowsMutation,
} from "@/mutations/imports/use-import-mutations";
import { useImportGroupsQuery } from "@/queries/imports/use-imports-query";
import { listImportRows } from "@/services/imports.service";
import { useDefaultCurrencyCode } from "@/stores/auth-session-store";
import { AccountPicker, CreditCardPicker, MerchantPicker } from "./import-pickers";
import { ImportRowDialog } from "./import-row-dialog";
import { FilterTabs, ImportRowsTable, ROW_FILTERS } from "./import-rows-table";

type TargetType = ImportMapping["targetType"];

function GroupRow({ batch, group }: { batch: ImportBatch; group: ImportGroup }) {
  const defaultCurrency = useDefaultCurrencyCode();
  const save = useSaveImportMappingMutation();
  const isCard = batch.sourceKind === "credit_card";
  const mapping: ImportMapping = group.mapping ?? {
    targetType: "none",
    merchantId: null,
    accountId: null,
    creditCardId: null,
    categoryId: null,
    tagIds: [],
  };
  const currency = batch.currencyCode ?? defaultCurrency;

  const apply = (patch: Partial<ImportMapping>) =>
    save.mutate({ id: batch.id, body: { sourceKey: group.sourceKey, ...mapping, ...patch } });

  const isMoneyMove = mapping.targetType === "account" || mapping.targetType === "credit_card";

  return (
    <div className="space-y-2 rounded-xl border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium break-words">{group.displayName}</p>
          {group.sampleDescription !== group.displayName ? (
            <p className="text-[0.6875rem] break-words text-muted-foreground">
              e.g. {group.sampleDescription}
            </p>
          ) : null}
          <p className="text-[0.6875rem] text-muted-foreground">
            {group.rowCount} row{group.rowCount === 1 ? "" : "s"}
          </p>
        </div>
        <AmountDisplay amount={group.totalAmount} currencyCode={currency} kind="auto" />
      </div>
      {group.hint && mapping.targetType === "none" ? (
        <Badge variant="outline" className="h-auto whitespace-normal py-1">
          {group.hint}
        </Badge>
      ) : null}
      <div className="grid gap-2 md:grid-cols-2">
        <Select
          value={mapping.targetType}
          onValueChange={(value) => apply({ targetType: value as TargetType })}
        >
          <SelectTrigger aria-label={`What is ${group.displayName}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Not mapped (no merchant)</SelectItem>
            <SelectItem value="merchant">A merchant</SelectItem>
            {isCard ? (
              <SelectItem value="account">An account that paid this invoice</SelectItem>
            ) : (
              <>
                <SelectItem value="account">Another account (transfer)</SelectItem>
                <SelectItem value="credit_card">A credit card (invoice payment)</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
        {mapping.targetType === "merchant" ? (
          <MerchantPicker
            id={`merchant-${group.sourceKey}`}
            value={mapping.merchantId}
            onChange={(merchantId) => apply({ merchantId })}
            suggestedName={group.displayName}
          />
        ) : null}
        {mapping.targetType === "account" ? (
          <AccountPicker
            id={`account-${group.sourceKey}`}
            value={mapping.accountId}
            onChange={(accountId) => apply({ accountId })}
          />
        ) : null}
        {mapping.targetType === "credit_card" ? (
          <CreditCardPicker
            id={`card-${group.sourceKey}`}
            value={mapping.creditCardId}
            onChange={(creditCardId) => apply({ creditCardId })}
          />
        ) : null}
      </div>
      {!isMoneyMove ? (
        <div className="grid gap-2 md:grid-cols-2">
          <CategorySelectControl
            id={`category-${group.sourceKey}`}
            value={mapping.categoryId ?? ""}
            onChange={(categoryId) => apply({ categoryId: categoryId || null })}
            allowClear
            clearLabel="No category"
            placeholder="Category"
          />
          <TagSelectControl
            id={`tags-${group.sourceKey}`}
            value={mapping.tagIds}
            onChange={(tagIds) => apply({ tagIds })}
            placeholder="Tags"
            maxVisibleTags={3}
          />
        </div>
      ) : null}
    </div>
  );
}

function SummaryChip({
  label,
  count,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  tone?: "bad" | "good";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border px-3 py-1.5 text-left transition-colors hover:bg-muted/50"
    >
      <p
        className={`text-sm font-semibold ${tone === "bad" && count > 0 ? "text-destructive" : ""}`}
      >
        {count}
      </p>
      <p className="text-[0.6875rem] text-muted-foreground">{label}</p>
    </button>
  );
}

/** Step 2: pick the Luraba target, map each bank name once, review every row, skip what you don't want. */
export function MapStep({
  batch,
  onBack,
  onStarted,
}: {
  batch: ImportBatch;
  onBack: () => void;
  onStarted: () => void;
}) {
  const defaultCurrency = useDefaultCurrencyCode();
  const isCard = batch.sourceKind === "credit_card";
  const currency = batch.currencyCode ?? defaultCurrency;
  const updateImport = useUpdateImportMutation();
  const updateRows = useUpdateImportRowsMutation();
  const start = useStartImportMutation();
  const [filter, setFilter] = React.useState<ImportFilter>("all");
  const [onlyUnmapped, setOnlyUnmapped] = React.useState(false);
  const [editing, setEditing] = React.useState<ImportRow | null>(null);
  const groups = useImportGroupsQuery(batch.id, { filter: onlyUnmapped ? "unmapped" : "all" });

  const targetId = isCard ? batch.targetCreditCardId : batch.targetAccountId;
  const { summary } = batch;
  const suggested = batch.suggestedTarget;

  const setTarget = (id: string | null) =>
    updateImport.mutate({
      id: batch.id,
      body: isCard ? { targetCreditCardId: id } : { targetAccountId: id },
    });

  const skipBlocked = async () => {
    const blocked = await listImportRows(batch.id, { filter: "invalid", perPage: 1000 });
    if (blocked.data.length > 0)
      updateRows.mutate({
        id: batch.id,
        body: { rowIds: blocked.data.map((row) => row.id), skip: true },
      });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>
            {isCard ? "Which Luraba credit card is this?" : "Which Luraba account is this?"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="max-w-md">
            {isCard ? (
              <CreditCardPicker id="import-target" value={targetId} onChange={setTarget} />
            ) : (
              <AccountPicker id="import-target" value={targetId} onChange={setTarget} />
            )}
          </div>
          {!targetId && suggested ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setTarget(suggested.id)}
            >
              Use the one from your last import of this file type
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">
            File says: {batch.institution ?? "unknown institution"}
            {batch.sourceAccountRef ? `, account ${batch.sourceAccountRef}` : ""}. Rows already in
            Luraba are detected once you pick the target.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <SummaryChip label="Ready" count={summary.ready} onClick={() => setFilter("all")} />
        <SummaryChip
          label="Blocked"
          count={summary.invalid}
          tone="bad"
          onClick={() => setFilter("invalid")}
        />
        <SummaryChip
          label="Warnings"
          count={summary.warnings}
          onClick={() => setFilter("attention")}
        />
        <SummaryChip
          label="Already in Luraba"
          count={summary.duplicates}
          onClick={() => setFilter("duplicates")}
        />
        <SummaryChip label="Skipped" count={summary.skipped} onClick={() => setFilter("skipped")} />
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">Map the bank's names</h3>
            <p className="text-xs text-muted-foreground">
              Each distinct name appears once. Map it and every row with that name follows; Luraba
              remembers it for the next file.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setOnlyUnmapped((value) => !value)}
          >
            {onlyUnmapped ? "Show all names" : "Show only names that need a decision"}
          </Button>
        </div>
        <div className="space-y-2">
          {(groups.data ?? []).map((group) => (
            <GroupRow key={group.sourceKey} batch={batch} group={group} />
          ))}
          {groups.data?.length === 0 ? (
            <p className="rounded-xl border px-3 py-4 text-center text-xs text-muted-foreground">
              Nothing needs a decision.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-medium">Every row</h3>
            <p className="text-xs text-muted-foreground">
              Blocked rows must be fixed or skipped. Rows already in Luraba start skipped.
            </p>
          </div>
          {summary.invalid > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={skipBlocked}
              disabled={updateRows.isPending}
            >
              Skip all {summary.invalid} blocked rows
            </Button>
          ) : null}
        </div>
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
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            {summary.ready} row{summary.ready === 1 ? "" : "s"} will be imported
            {summary.invalid > 0 ? `, ${summary.invalid} blocked` : ""}.
          </p>
          <Button
            type="button"
            disabled={
              !targetId || start.isPending || (summary.ready === 0 && summary.invalid === 0)
            }
            onClick={() =>
              start.mutate(
                { id: batch.id, body: { skipInvalid: summary.invalid > 0 } },
                { onSuccess: onStarted },
              )
            }
          >
            {summary.invalid > 0 ? "Import, skipping blocked rows" : "Import in the background"}
          </Button>
        </div>
      </div>
      <ImportRowDialog
        batchId={batch.id}
        row={editing}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
