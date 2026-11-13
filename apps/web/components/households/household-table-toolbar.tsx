"use client";

import type { Table } from "@tanstack/react-table";
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { FilterBar, type FilterFieldDef } from "@/components/filters";
import type { FiltersState } from "@/components/filters/use-filters";

/** Search + filter chips + column menu of the members and invitations tables. */
export function HouseholdTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  defs,
  filters,
  placeholder = "Search...",
}: {
  table?: Table<TData>;
  search: string;
  onSearchChange: (value: string) => void;
  defs: readonly FilterFieldDef[];
  filters: FiltersState;
  placeholder?: string;
}) {
  return (
    <FilterBar
      defs={defs}
      filters={filters}
      search={
        <DataTableSearchInput
          aria-label={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="w-full sm:max-w-xs sm:flex-1"
        />
      }
      trailing={table ? <DataTableViewOptions table={table} /> : undefined}
    />
  );
}
