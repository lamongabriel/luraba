"use client";

import type { Row, Table } from "@tanstack/react-table";
import type * as React from "react";

import { ListGroupHeader, ListRow, type ListRowProps } from "@/components/lists/list-row";

/**
 * How a table's rows read as a mobile list. Pass it as `mobile={{ row, group }}` on `DataTable`;
 * converting a table is this config, not a rewrite.
 */
export interface MobileRowConfig<TData> {
  /**
   * The row's content. `grouped` is true when the list shows group headers, so the row can drop
   * what the header already says (the date). Use the shared display components.
   */
  row: (data: TData, context: { grouped: boolean }) => Omit<ListRowProps, "onClick" | "selected">;
  /** Group consecutive rows under a header (a day). Omit for a flat list. */
  group?: (data: TData) => { key: string; label: React.ReactNode };
  /** Group only while sorted by one of these column ids (or unsorted); other sorts make groups meaningless. */
  groupSortIds?: string[];
  /** Spoken name of a tappable row. */
  ariaLabel?: (data: TData) => string;
}

export function isMobileListGrouped<TData>(
  table: Table<TData>,
  config: MobileRowConfig<TData>,
): boolean {
  if (!config.group) return false;
  const sorting = table.getState().sorting;
  if (sorting.length === 0 || !config.groupSortIds) return true;
  return config.groupSortIds.includes(sorting[0]?.id ?? "");
}

/** The rows of a table as a plain list, grouped under headers when the config asks for it. */
export function MobileList<TData>({
  table,
  config,
  onRowClick,
  className,
}: {
  table: Table<TData>;
  config: MobileRowConfig<TData>;
  onRowClick?: (row: Row<TData>) => void;
  className?: string;
}) {
  const grouped = isMobileListGrouped(table, config);
  const rows = table.getRowModel().rows;
  const nodes: React.ReactNode[] = [];
  let lastKey: string | null = null;

  for (const row of rows) {
    if (grouped && config.group) {
      const group = config.group(row.original);
      if (group.key !== lastKey) {
        nodes.push(
          <ListGroupHeader key={`group-${group.key}-${row.id}`}>{group.label}</ListGroupHeader>,
        );
        lastKey = group.key;
      }
    }
    nodes.push(
      <ListRow
        key={row.id}
        {...config.row(row.original, { grouped })}
        ariaLabel={config.ariaLabel?.(row.original)}
        selected={row.getIsSelected()}
        onClick={onRowClick ? () => onRowClick(row) : undefined}
      />,
    );
  }

  return (
    <div data-slot="mobile-list" className={className}>
      {nodes}
    </div>
  );
}
