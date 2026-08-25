import {
  flexRender,
  type Row,
  type Table as TanstackTable,
} from "@tanstack/react-table"
import type * as React from "react"

import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getColumnPinningStyle } from "@/lib/data-table"
import { cn } from "@/lib/utils"

function isRowActionTarget(target: EventTarget | null) {
  return (
    target instanceof Element && Boolean(target.closest("[data-row-action]"))
  )
}

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>
  actionBar?: React.ReactNode
  emptyState?: React.ReactNode
  onRowClick?: (row: Row<TData>) => void
  pageSizeOptions?: number[]
  showPagination?: boolean
  totalCount?: number
  itemLabel?: string
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  emptyState,
  onRowClick,
  pageSizeOptions,
  showPagination = true,
  totalCount,
  itemLabel,
  ...props
}: DataTableProps<TData>) {
  return (
    <div
      className={cn(
        "flex min-w-0 w-full max-w-full flex-col gap-2.5 overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
      <div className="min-w-0 max-w-full overflow-x-auto overflow-y-hidden rounded-md border">
        <Table className="min-w-[72rem]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} data-hover-disabled="true">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{
                      ...getColumnPinningStyle({ column: header.column }),
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={(event) => {
                    if (event.defaultPrevented) return
                    if (isRowActionTarget(event.target)) {
                      return
                    }
                    onRowClick?.(row)
                  }}
                  className={cn(
                    "transition-colors",
                    onRowClick && "active:bg-primary/15",
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        ...getColumnPinningStyle({ column: cell.column }),
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow data-hover-disabled="true">
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  {emptyState ?? "No results."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-2.5">
        {showPagination ? (
          <DataTablePagination
            table={table}
            totalCount={totalCount}
            itemLabel={itemLabel}
            pageSizeOptions={pageSizeOptions}
            showSelection={Boolean(table.options.enableRowSelection)}
          />
        ) : null}
        {actionBar && table.getSelectedRowModel().rows.length > 0 && actionBar}
      </div>
    </div>
  )
}
