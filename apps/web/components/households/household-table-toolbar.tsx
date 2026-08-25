"use client"

import type { Table } from "@tanstack/react-table"
import { DataTableSearchInput } from "@/components/data-table/data-table-search-input"
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options"
import { FilterFaceted } from "@/components/filters/filter-faceted"
import { Button } from "@/components/ui/button"
import type { Option } from "@/types/data-table"

export function HouseholdTableToolbar<TData>({
  table,
  search,
  onSearchChange,
  role,
  onRoleChange,
  roleOptions,
  onClear,
  hasFilters,
  placeholder = "Search...",
  children,
  filterTitle = "Role",
}: {
  table?: Table<TData>
  search: string
  onSearchChange: (value: string) => void
  role?: string
  onRoleChange?: (value: string | undefined) => void
  roleOptions?: ReadonlyArray<{ value: string; label: string }>
  onClear: () => void
  hasFilters: boolean
  placeholder?: string
  children?: React.ReactNode
  filterTitle?: string
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <DataTableSearchInput
          aria-label={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          className="w-full sm:max-w-sm sm:flex-1"
        />
        {roleOptions && onRoleChange ? (
          <FilterFaceted
            title={filterTitle}
            value={role}
            options={roleOptions as Option[]}
            onValueChange={(value) =>
              onRoleChange(
                typeof value === "string" && value.length > 0
                  ? value
                  : undefined,
              )
            }
          />
        ) : null}
        {children}
        {hasFilters ? (
          <Button variant="ghost" className="h-7" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {table ? <DataTableViewOptions table={table} /> : null}
      </div>
    </div>
  )
}
