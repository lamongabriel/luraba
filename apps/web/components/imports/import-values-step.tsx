"use client";

import type { ImportBatch, ImportGroup, ImportMapping, ImportValueField } from "@luraba/contracts";
import * as React from "react";
import { AmountDisplay } from "@/components/display";
import { DataBoundary, TableSkeleton } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSaveImportMappingMutation } from "@/mutations/imports/use-import-mutations";
import { useImportGroupsQuery } from "@/queries/imports/use-imports-query";
import { useDefaultCurrencyCode } from "@/stores/auth-session-store";
import {
  AccountPicker,
  CategoryPicker,
  CreditCardPicker,
  MerchantPicker,
  TagPicker,
} from "./import-pickers";

const EMPTY_MAPPING: ImportMapping = {
  targetType: "none",
  merchantId: null,
  accountId: null,
  creditCardId: null,
  categoryId: null,
  tagIds: [],
};

const MAX_VISIBLE = 100;

type RowProps = { batch: ImportBatch; group: ImportGroup; currencyCode: string };

/** The first three cells every row shares: the file's value, how many rows use it, their total. */
function GroupCells({ group, currencyCode }: { group: ImportGroup; currencyCode: string }) {
  return (
    <>
      <TableCell className="max-w-72 align-top">
        <p className="text-xs font-medium break-words">{group.displayName}</p>
        {group.sampleDescription !== group.displayName ? (
          <p className="text-[0.6875rem] break-words text-muted-foreground">
            e.g. {group.sampleDescription}
          </p>
        ) : null}
        {group.hint ? (
          <Badge variant="outline" className="mt-1">
            {group.hint}
          </Badge>
        ) : null}
      </TableCell>
      <TableCell className="text-right align-top whitespace-nowrap">{group.rowCount}</TableCell>
      <TableCell className="text-right align-top whitespace-nowrap">
        <AmountDisplay amount={group.totalAmount} currencyCode={currencyCode} kind="auto" />
      </TableCell>
    </>
  );
}

/** One name from the file: pick the merchant it is (or create it). Transfers are one click away. */
function MerchantGroupRow({ batch, group, currencyCode }: RowProps) {
  const save = useSaveImportMappingMutation();
  const mapping = group.mapping ?? EMPTY_MAPPING;
  const isCard = batch.sourceKind === "credit_card";
  const [moneyMove, setMoneyMove] = React.useState(
    mapping.targetType === "account" || mapping.targetType === "credit_card" || Boolean(group.hint),
  );
  const apply = (patch: Partial<ImportMapping>) =>
    save.mutate({
      id: batch.id,
      body: { field: "merchant", sourceKey: group.sourceKey, ...mapping, ...patch },
    });

  return (
    <TableRow>
      <GroupCells group={group} currencyCode={currencyCode} />
      {moneyMove ? (
        <TableCell colSpan={2} className="align-top">
          <div className="grid gap-2 md:grid-cols-2">
            <Select
              value={mapping.targetType === "merchant" ? "none" : mapping.targetType}
              onValueChange={(value) =>
                apply({
                  targetType: value as ImportMapping["targetType"],
                  merchantId: null,
                  accountId: null,
                  creditCardId: null,
                })
              }
            >
              <SelectTrigger aria-label={`What is ${group.displayName}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Choose...</SelectItem>
                <SelectItem value="account">
                  {isCard ? "An account that paid this invoice" : "Another account (transfer)"}
                </SelectItem>
                {isCard ? null : <SelectItem value="credit_card">A credit card payment</SelectItem>}
              </SelectContent>
            </Select>
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
        </TableCell>
      ) : (
        <>
          <TableCell className="min-w-56 align-top">
            <MerchantPicker
              id={`merchant-${group.sourceKey}`}
              value={mapping.merchantId}
              onChange={(merchantId) =>
                apply({ targetType: merchantId ? "merchant" : "none", merchantId })
              }
              suggestedName={group.displayName}
              placeholder="No merchant"
            />
            {isCard ? null : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mt-1 h-auto px-1 text-[0.6875rem] text-muted-foreground"
                onClick={() => setMoneyMove(true)}
              >
                Transfer or card payment
              </Button>
            )}
          </TableCell>
          <TableCell className="min-w-56 align-top">
            <CategoryPicker
              id={`category-${group.sourceKey}`}
              value={mapping.categoryId}
              onChange={(categoryId) => apply({ categoryId })}
              type={group.totalAmount > 0 ? "income" : "expense"}
              suggestedName=""
              placeholder="No category"
            />
          </TableCell>
        </>
      )}
    </TableRow>
  );
}

function CategoryGroupRow({ batch, group, currencyCode }: RowProps) {
  const save = useSaveImportMappingMutation();
  const mapping = group.mapping ?? EMPTY_MAPPING;
  return (
    <TableRow>
      <GroupCells group={group} currencyCode={currencyCode} />
      <TableCell className="min-w-56 align-top">
        <CategoryPicker
          id={`value-category-${group.sourceKey}`}
          value={mapping.categoryId}
          onChange={(categoryId) =>
            save.mutate({
              id: batch.id,
              body: {
                field: "category",
                sourceKey: group.sourceKey,
                targetType: "none",
                categoryId,
              },
            })
          }
          type={group.totalAmount > 0 ? "income" : "expense"}
          suggestedName={group.displayName}
          placeholder="No category"
        />
      </TableCell>
    </TableRow>
  );
}

function TagGroupRow({ batch, group, currencyCode }: RowProps) {
  const save = useSaveImportMappingMutation();
  const mapping = group.mapping ?? EMPTY_MAPPING;
  return (
    <TableRow>
      <GroupCells group={group} currencyCode={currencyCode} />
      <TableCell className="min-w-56 align-top">
        <TagPicker
          id={`value-tag-${group.sourceKey}`}
          value={mapping.tagIds}
          onChange={(tagIds) =>
            save.mutate({
              id: batch.id,
              body: { field: "tag", sourceKey: group.sourceKey, targetType: "none", tagIds },
            })
          }
          suggestedName={group.displayName}
          placeholder="No tag"
        />
      </TableCell>
    </TableRow>
  );
}

const TAB_HEADS: Record<ImportValueField, string[]> = {
  merchant: ["Merchant", "Category"],
  category: ["Category"],
  tag: ["Tags"],
};

const TAB_LABELS: Record<ImportValueField, string> = {
  merchant: "Merchants",
  category: "Categories",
  tag: "Tags",
};

const TAB_HELP: Record<ImportValueField, string> = {
  merchant:
    "Each name in the file appears once. Pick the merchant it is, or create it. Leave it empty if it has no merchant.",
  category:
    "Match each category in your file to one of yours, or create it. Leave it empty to skip.",
  tag: "Match each tag in your file to one of yours, or create it. Leave it empty to skip.",
};

/** Step 3: map the distinct values of the file to merchants, categories and tags. */
export function ValuesStep({
  batch,
  onBack,
  onNext,
}: {
  batch: ImportBatch;
  onBack: () => void;
  onNext: () => void;
}) {
  const currencyCode = useDefaultCurrencyCode();
  const columns = batch.columnMapping?.columns;
  const tabs: ImportValueField[] = [
    "merchant",
    ...(columns?.category ? (["category"] as const) : []),
    ...(columns?.tags ? (["tag"] as const) : []),
  ];
  const [field, setField] = React.useState<ImportValueField>("merchant");
  const [search, setSearch] = React.useState("");
  const [onlyOpen, setOnlyOpen] = React.useState(false);
  const groups = useImportGroupsQuery(batch.id, {
    field,
    filter: onlyOpen ? "unmapped" : "all",
  });

  const term = search.trim().toLowerCase();
  const all = groups.data ?? [];
  const matching = term
    ? all.filter((group) => group.displayName.toLowerCase().includes(term))
    : all;
  const visible = matching.slice(0, MAX_VISIBLE);
  const Row =
    field === "merchant" ? MerchantGroupRow : field === "category" ? CategoryGroupRow : TagGroupRow;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1" role="tablist" aria-label="Values to map">
          {tabs.map((tab) => (
            <Button
              key={tab}
              type="button"
              role="tab"
              aria-selected={field === tab}
              size="sm"
              variant={field === tab ? "secondary" : "ghost"}
              onClick={() => {
                setField(tab);
                setSearch("");
              }}
            >
              {TAB_LABELS[tab]}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            aria-label="Search values"
            className="w-48"
          />
          <Button
            type="button"
            size="sm"
            variant={onlyOpen ? "secondary" : "outline"}
            aria-pressed={onlyOpen}
            onClick={() => setOnlyOpen((value) => !value)}
          >
            {field === "merchant" ? "Needs a decision" : "Not mapped"}
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{TAB_HELP[field]}</p>

      <DataBoundary
        isPending={groups.isPending}
        isError={groups.isError}
        error={groups.error}
        onRetry={() => void groups.refetch()}
        errorTitle="Couldn't load the values"
        isEmpty={visible.length === 0}
        emptyProps={{
          title: onlyOpen ? "Nothing needs a decision" : "Nothing to map",
          description: term ? "No value matches your search." : undefined,
        }}
        loading={<TableSkeleton columns={3} rows={6} label="Loading the values" />}
      >
        <div className="space-y-2">
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>In your file</TableHead>
                  <TableHead className="w-16 text-right">Rows</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  {TAB_HEADS[field].map((head) => (
                    <TableHead key={head}>{head}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((group) => (
                  <Row
                    key={group.sourceKey}
                    batch={batch}
                    group={group}
                    currencyCode={currencyCode}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          {matching.length > visible.length ? (
            <p className="text-center text-xs text-muted-foreground">
              Showing {visible.length} of {matching.length}. Search to narrow the list.
            </p>
          ) : null}
        </div>
      </DataBoundary>

      <div className="sticky bottom-0 flex justify-between border-t bg-background/95 py-3 backdrop-blur">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Next: review
        </Button>
      </div>
    </div>
  );
}
