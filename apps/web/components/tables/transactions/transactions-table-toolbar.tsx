"use client";

import { Cancel01Icon, FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { TransactionFeedRow } from "@luraba/contracts";
import type { Table } from "@tanstack/react-table";
import { format, isValid, parseISO } from "date-fns";
import * as React from "react";
import type { DateRange } from "react-day-picker";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { FilterDate } from "@/components/filters/filter-date";
import { FilterFaceted } from "@/components/filters/filter-faceted";
import {
  TRANSACTION_ORIGIN_TYPE_OPTIONS,
  type TransactionTableFilters,
  type TransactionTableFilterUpdates,
} from "@/components/tables/transactions/transactions-table-filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

function parseDate(value: string) {
  if (!value) return undefined;
  const date = parseISO(value);
  return isValid(date) ? date : undefined;
}

function getDateRange(from: string, to: string): DateRange | undefined {
  const range = { from: parseDate(from), to: parseDate(to) };
  return range.from || range.to ? range : undefined;
}

function BooleanFilter({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: boolean | null) => void;
  value: boolean | null;
}) {
  return (
    <div className="space-y-1.5">
      <Typography variant="small-strong">{label}</Typography>
      <Select
        value={value === null ? "all" : String(value)}
        onValueChange={(nextValue) => onChange(nextValue === "all" ? null : nextValue === "true")}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function TransactionsTableToolbar({
  clearFilters,
  filters,
  hasFilters,
  lookups,
  search,
  setFilter,
  setFilters,
  setSearch,
  table,
}: {
  clearFilters: () => void;
  filters: TransactionTableFilters;
  hasFilters: boolean;
  lookups: TransactionLookups;
  search: string;
  setFilter: (key: keyof TransactionTableFilters, value: unknown) => void;
  setFilters: (updates: TransactionTableFilterUpdates) => void;
  setSearch: (value: string) => void;
  table: Table<TransactionFeedRow>;
}) {
  const datePickerDisabled = React.useMemo(() => ({ after: new Date() }), []);
  const setDateRange = (
    fromKey: keyof TransactionTableFilters,
    toKey: keyof TransactionTableFilters,
    value: Date | DateRange | undefined,
  ) => {
    const range = value && !(value instanceof Date) ? value : undefined;
    setFilters({
      [fromKey]: range?.from ? format(range.from, "yyyy-MM-dd") : null,
      [toKey]: range?.to ? format(range.to, "yyyy-MM-dd") : null,
    });
  };
  const activeFilterCount = Object.values(filters).filter((value) =>
    Array.isArray(value)
      ? value.length > 0
      : typeof value === "string"
        ? value.length > 0
        : value !== null,
  ).length;
  const accountOptions = lookups.accounts.map((account) => ({
    value: account.id,
    label: `${account.name} · ${account.currencyCode}`,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DataTableSearchInput
        value={search}
        placeholder="Search transactions..."
        className="min-w-56 flex-1 sm:max-w-sm"
        onChange={(event) => setSearch(event.target.value)}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="border-dashed font-normal">
            <HugeiconsIcon icon={FilterIcon} strokeWidth={2} />
            Filters
            {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-[min(38rem,var(--radix-popover-content-available-height))] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto p-4 shadow-none"
        >
          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Typography variant="small-strong">Dates</Typography>
              <FilterDate
                multiple
                disabled={datePickerDisabled}
                value={getDateRange(filters.dateFrom, filters.dateTo)}
                onValueChange={(value) => setDateRange("dateFrom", "dateTo", value)}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Type</Typography>
              <FilterFaceted
                multiple
                value={filters.originTypes}
                options={TRANSACTION_ORIGIN_TYPE_OPTIONS}
                onValueChange={(value) => setFilter("originTypes", value ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Accounts</Typography>
              <FilterFaceted
                multiple
                value={filters.accountIds}
                options={accountOptions}
                onValueChange={(value) => setFilter("accountIds", value ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Purchase date</Typography>
              <FilterDate
                multiple
                disabled={datePickerDisabled}
                value={getDateRange(filters.purchaseDateFrom, filters.purchaseDateTo)}
                onValueChange={(value) => setDateRange("purchaseDateFrom", "purchaseDateTo", value)}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Credit cards</Typography>
              <FilterFaceted
                multiple
                value={filters.creditCardIds}
                options={lookups.creditCards.map((card) => ({
                  value: card.id,
                  label: `${card.name} · •••• ${card.last4}`,
                }))}
                onValueChange={(value) => setFilter("creditCardIds", value ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Categories</Typography>
              <FilterFaceted
                multiple
                value={[
                  ...filters.categoryIds,
                  ...(filters.uncategorized ? ["__uncategorized__"] : []),
                ]}
                options={[
                  { value: "__uncategorized__", label: "Uncategorized" },
                  ...lookups.categories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                onValueChange={(value) => {
                  const selected = Array.isArray(value) ? value : value ? [value] : [];
                  const hasUncategorized = selected.includes("__uncategorized__");
                  setFilters({
                    categoryIds: selected.filter((item) => item !== "__uncategorized__"),
                    uncategorized: hasUncategorized,
                  });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Merchants</Typography>
              <FilterFaceted
                multiple
                value={filters.merchantIds}
                options={lookups.merchants.map((merchant) => ({
                  value: merchant.id,
                  label: merchant.name,
                }))}
                onValueChange={(value) => setFilter("merchantIds", value ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Tags</Typography>
              <FilterFaceted
                multiple
                value={filters.tagIds}
                options={lookups.tags.map((tag) => ({
                  value: tag.id,
                  label: tag.name,
                }))}
                onValueChange={(value) => setFilter("tagIds", value ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Payment methods</Typography>
              <FilterFaceted
                multiple
                value={filters.paymentMethodCodes}
                options={lookups.paymentMethods.map((method) => ({
                  value: method.code,
                  label: method.name,
                }))}
                onValueChange={(value) => setFilter("paymentMethodCodes", value ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Typography variant="small-strong">Currencies</Typography>
              <FilterFaceted
                multiple
                value={filters.currencyCodes}
                options={lookups.currencies.map((currency) => ({
                  value: currency.code,
                  label: currency.code,
                }))}
                onValueChange={(value) => setFilter("currencyCodes", value ?? null)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Typography variant="small-strong">Minimum amount</Typography>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={filters.amountMin ?? ""}
                  onChange={(event) =>
                    setFilter("amountMin", event.target.value ? Number(event.target.value) : null)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Typography variant="small-strong">Maximum amount</Typography>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={filters.amountMax ?? ""}
                  onChange={(event) =>
                    setFilter("amountMax", event.target.value ? Number(event.target.value) : null)
                  }
                />
              </div>
              <Typography variant="small-muted" className="col-span-2">
                Amount filters use each currency’s smallest stored unit.
              </Typography>
            </div>
            <BooleanFilter
              label="Included in budget"
              value={filters.includeInBudget}
              onChange={(value) => setFilter("includeInBudget", value)}
            />
          </div>
        </PopoverContent>
      </Popover>

      {hasFilters ? (
        <Button variant="ghost" onClick={clearFilters}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
          Clear all
        </Button>
      ) : null}
      <DataTableViewOptions table={table} align="end" />
    </div>
  );
}
