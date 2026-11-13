"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import type { Table } from "@tanstack/react-table";
import * as React from "react";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { FilterBar } from "@/components/filters";
import type { DateFilterState } from "@/components/filters/use-date-filter";
import type { FiltersState } from "@/components/filters/use-filters";
import { buildTransactionFilterDefs } from "@/components/tables/transactions/transactions-table-filters";
import { useMemberLookup } from "@/hooks/use-member-lookup";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

/**
 * The transactions filter row. Desktop: search, the fixed date filter, one "Actions" menu (add a filter, columns) and
 * the filter chips. Phone: just the search, lined up with the list under it; the date filter sits in the summary block
 * and the Filters drawer is opened from the page header, and there is no column menu.
 */
export function TransactionsTableToolbar({
  date,
  filters,
  lookups,
  mobileFiltersOpen,
  onMobileFiltersOpenChange,
  search,
  setSearch,
  table,
}: {
  date: DateFilterState;
  filters: FiltersState;
  lookups: TransactionLookups;
  mobileFiltersOpen: boolean;
  onMobileFiltersOpenChange: (open: boolean) => void;
  search: string;
  setSearch: (value: string) => void;
  table: Table<TransactionFeedRow>;
}) {
  const isMobile = useIsMobile();
  const { members } = useMemberLookup();
  const defs = React.useMemo(
    () => buildTransactionFilterDefs(lookups, members),
    [lookups, members],
  );

  return (
    <FilterBar
      defs={defs}
      filters={filters}
      date={isMobile ? undefined : date}
      table={table}
      mobileOpen={mobileFiltersOpen}
      onMobileOpenChange={onMobileFiltersOpenChange}
      mobileTrigger={false}
      className="max-md:flex-nowrap"
      search={
        <DataTableSearchInput
          value={search}
          placeholder="Search transactions..."
          aria-label="Search transactions"
          className="min-w-56 flex-1 sm:max-w-xs max-md:min-w-0"
          onChange={(event) => setSearch(event.target.value)}
        />
      }
    />
  );
}
