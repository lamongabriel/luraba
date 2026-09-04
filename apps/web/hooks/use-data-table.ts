import type { SortDirection } from "@luraba/contracts"
import {
  type ColumnFiltersState,
  getCoreRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import * as React from "react"
import type { ExtendedColumnSort } from "@/types/data-table"

interface UseDataTableProps<TData>
  extends Omit<
      TableOptions<TData>,
      | "state"
      | "pageCount"
      | "getCoreRowModel"
      | "manualFiltering"
      | "manualPagination"
      | "manualSorting"
    >,
    Required<Pick<TableOptions<TData>, "pageCount">> {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[]
  }
  page: number
  perPage: number
  sort?: Extract<keyof TData, string>
  sortDirection?: SortDirection
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  onSortChange: (
    sort: Extract<keyof TData, string> | undefined,
    direction?: SortDirection,
  ) => void
}

/**
 * Controlled server-side TanStack table adapter. URL/query-string ownership
 * intentionally stays in `useApiParams`, so sorting can only be represented as
 * one flat API field plus one direction.
 */
export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount,
    initialState,
    page,
    perPage,
    sort,
    sortDirection = "asc",
    onPageChange,
    onPerPageChange,
    onSortChange,
    ...tableProps
  } = props

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  )
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState?.columnFilters ?? [],
  )

  const pagination: PaginationState = React.useMemo(
    () => ({ pageIndex: Math.max(page - 1, 0), pageSize: perPage }),
    [page, perPage],
  )
  const sorting: SortingState = React.useMemo(
    () => (sort ? [{ id: sort, desc: sortDirection === "desc" }] : []),
    [sort, sortDirection],
  )

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      const next =
        typeof updaterOrValue === "function"
          ? updaterOrValue(pagination)
          : updaterOrValue

      if (next.pageSize !== pagination.pageSize) {
        onPerPageChange(next.pageSize)
        return
      }

      onPageChange(next.pageIndex + 1)
    },
    [onPageChange, onPerPageChange, pagination],
  )

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      const next =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue
      const [nextSort] = next

      onSortChange(
        nextSort?.id as Extract<keyof TData, string> | undefined,
        nextSort ? (nextSort.desc ? "desc" : "asc") : undefined,
      )
    },
    [onSortChange, sorting],
  )

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
    },
    enableMultiSort: false,
    enableRowSelection: tableProps.enableRowSelection ?? false,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  })

  return { table }
}
