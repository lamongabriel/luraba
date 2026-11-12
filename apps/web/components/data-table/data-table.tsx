import { flexRender, type Row, type Table as TanstackTable } from "@tanstack/react-table";
import type * as React from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { MobileList, type MobileRowConfig } from "@/components/lists/mobile-list";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getColumnPinningStyle } from "@/lib/data-table";
import { cn } from "@/lib/utils";

function isRowActionTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-row-action]"));
}

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  emptyState?: React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
  pageSizeOptions?: number[];
  showPagination?: boolean;
  totalCount?: number;
  itemLabel?: string;
  /**
   * What the table becomes below `md` (no tables on mobile, see `components/lists/README.md`):
   * a row renderer config that draws the rows as a plain list, or `"table"` for the few tables that
   * are dense comparison data (document why where you pass it). Required so none is forgotten.
   */
  mobile: MobileRowConfig<TData> | "table";
  /** Stretch to the height of the parent (a flex column or grid cell) so the table fills it. */
  fill?: boolean;
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
  fill = false,
  mobile,
  ...props
}: DataTableProps<TData>) {
  return (
    <div
      className={cn(
        "flex min-w-0 w-full max-w-full flex-col gap-2.5 overflow-hidden",
        fill && "min-h-0 flex-1",
        className,
      )}
      {...props}
    >
      {children}
      {mobile !== "table" ? (
        <div className={cn("md:hidden", fill && "flex-1")}>
          {table.getRowModel().rows.length ? (
            <MobileList table={table} config={mobile} onRowClick={onRowClick} />
          ) : (
            <div className="flex h-24 items-center justify-center text-center text-xs">
              {emptyState ?? "No results."}
            </div>
          )}
        </div>
      ) : null}
      <div
        className={cn(
          "min-w-0 max-w-full overflow-x-auto overflow-y-hidden rounded-md border",
          fill && "flex-1",
          mobile !== "table" && "hidden md:block",
        )}
      >
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
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
                    if (event.defaultPrevented) return;
                    if (isRowActionTarget(event.target)) {
                      return;
                    }
                    onRowClick?.(row);
                  }}
                  className={cn("transition-colors", onRowClick && "active:bg-primary/15")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{
                        ...getColumnPinningStyle({ column: cell.column }),
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow data-hover-disabled="true">
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
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
  );
}
