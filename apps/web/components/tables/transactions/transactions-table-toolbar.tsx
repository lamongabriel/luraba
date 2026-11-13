"use client";

import type { TransactionFeedRow } from "@luraba/contracts";
import type { Table } from "@tanstack/react-table";
import * as React from "react";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { FilterBar } from "@/components/filters";
import type { DateFilterState } from "@/components/filters/use-date-filter";
import type { FiltersState } from "@/components/filters/use-filters";
import { buildTransactionFilterDefs } from "@/components/tables/transactions/transactions-table-filters";
import { useMemberLookup } from "@/hooks/use-member-lookup";
import type { TransactionLookups } from "@/queries/transactions/use-transaction-lookups-query";

/** The transactions filter row: search, the fixed date filter, the filter chips and the column menu. */
export function TransactionsTableToolbar({
  date,
  filters,
  lookups,
  search,
  setSearch,
  table,
}: {
  date: DateFilterState;
  filters: FiltersState;
  lookups: TransactionLookups;
  search: string;
  setSearch: (value: string) => void;
  table: Table<TransactionFeedRow>;
}) {
  const { members } = useMemberLookup();
  const defs = React.useMemo(
    () => buildTransactionFilterDefs(lookups, members),
    [lookups, members],
  );

  return (
    <FilterBar
      defs={defs}
      filters={filters}
      date={date}
      search={
        <DataTableSearchInput
          value={search}
          placeholder="Search transactions..."
          aria-label="Search transactions"
          className="min-w-56 flex-1 sm:max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
        />
      }
      trailing={<DataTableViewOptions table={table} align="end" />}
    />
  );
}
