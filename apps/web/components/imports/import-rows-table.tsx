"use client";

import type { ImportFilter, ImportRow } from "@luraba/contracts";
import { MAX_PER_PAGE } from "@luraba/contracts";
import * as React from "react";
import { AmountDisplay, CategoryDisplay, MerchantDisplay } from "@/components/display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUpdateImportRowsMutation } from "@/mutations/imports/use-import-mutations";
import { useCategoriesQuery } from "@/queries/categories/use-categories-query";
import { useImportRowsQuery } from "@/queries/imports/use-imports-query";
import { useMerchantsQuery } from "@/queries/merchants/use-merchants-query";
import { IssueList, RowStatusBadge } from "./import-status";

export const ROW_FILTERS: Array<{ value: ImportFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "invalid", label: "Needs a fix" },
  { value: "duplicates", label: "Already in Luraba" },
  { value: "skipped", label: "Removed" },
];

export const RESULT_FILTERS: Array<{ value: ImportFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "created", label: "Imported" },
  { value: "duplicates", label: "Already in Luraba" },
  { value: "skipped", label: "Removed" },
  { value: "failed", label: "Failed" },
];

/** Date column: ISO `2026-10-28` shown as the bank wrote it would be dd/mm; the app uses ISO-like short dates. */
function formatRowDate(date: string | null) {
  if (!date) return "—";
  const [year, month, day] = date.split("-");
  return `${month}/${day}/${year}`;
}

export function FilterTabs({
  value,
  onChange,
  filters,
}: {
  value: ImportFilter;
  onChange: (value: ImportFilter) => void;
  filters: Array<{ value: ImportFilter; label: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="tablist">
      {filters.map((filter) => (
        <Button
          key={filter.value}
          type="button"
          role="tab"
          aria-selected={value === filter.value}
          size="sm"
          variant={value === filter.value ? "secondary" : "ghost"}
          onClick={() => onChange(filter.value)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

export function ImportRowsTable({
  batchId,
  currencyCode,
  filter,
  perPage = 25,
  editable,
  onEditRow,
}: {
  batchId: string;
  currencyCode: string;
  filter: ImportFilter;
  perPage?: number;
  /** Show the remove toggle and the edit button (review step). */
  editable: boolean;
  onEditRow?: (row: ImportRow) => void;
}) {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const query = useImportRowsQuery(batchId, { page, perPage, filter, search: search || undefined });
  const merchants = useMerchantsQuery({ perPage: MAX_PER_PAGE });
  const categories = useCategoriesQuery({ perPage: MAX_PER_PAGE });
  const updateRows = useUpdateImportRowsMutation();
  const merchantById = new Map((merchants.data?.data ?? []).map((m) => [m.id, m]));
  const categoryById = new Map((categories.data?.data ?? []).map((c) => [c.id, c]));

  const rows = query.data?.data ?? [];
  const totalPages = query.data?.meta.pagination.totalPages ?? 1;
  const totalCount = query.data?.meta.pagination.totalCount ?? 0;

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
        placeholder="Search descriptions..."
        aria-label="Search rows"
        className="max-w-xs"
      />
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Becomes</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              {editable ? <TableHead className="w-40" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const merchant = row.effective.merchantId
                ? merchantById.get(row.effective.merchantId)
                : undefined;
              const category = row.effective.categoryId
                ? categoryById.get(row.effective.categoryId)
                : undefined;
              return (
                <TableRow key={row.id} data-status={row.status}>
                  <TableCell className="align-top whitespace-nowrap">
                    {formatRowDate(row.postedDate)}
                  </TableCell>
                  <TableCell className="max-w-md align-top">
                    <p className="break-words">{row.descriptionOverride ?? row.description}</p>
                    {row.installmentTotal ? (
                      <p className="text-[0.6875rem] text-muted-foreground">
                        Installment {row.installmentNumber} of {row.installmentTotal}
                      </p>
                    ) : null}
                    <IssueList issues={row.issues} />
                    {row.outcomeMessage ? (
                      <p className="mt-1 text-[0.6875rem] text-muted-foreground">
                        {row.outcomeMessage}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      {row.kind ? (
                        <p className="text-[0.6875rem] text-muted-foreground">
                          {KIND_LABELS[row.kind]}
                        </p>
                      ) : null}
                      {merchant ? <MerchantDisplay merchant={merchant} size="xs" /> : null}
                      {category ? <CategoryDisplay category={category} size="xs" /> : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right align-top">
                    {row.amount === null ? (
                      "—"
                    ) : (
                      <AmountDisplay amount={row.amount} currencyCode={currencyCode} kind="auto" />
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <RowStatusBadge status={row.status} />
                  </TableCell>
                  {editable ? (
                    <TableCell className="align-top">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={updateRows.isPending}
                          onClick={() =>
                            updateRows.mutate({
                              id: batchId,
                              body: { rowIds: [row.id], skip: !row.skip },
                            })
                          }
                        >
                          {row.skip ? "Restore" : "Remove"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => onEditRow?.(row)}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
            {!query.isPending && rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={editable ? 6 : 5}
                  className="py-6 text-center text-muted-foreground"
                >
                  No rows match.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{totalCount} rows</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span>
            Page {page} of {Math.max(totalPages, 1)}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

const KIND_LABELS: Record<NonNullable<ImportRow["kind"]>, string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
  card_purchase: "Card purchase",
  card_payment: "Card payment",
  unsupported: "Not importable",
};
