"use client";

import { ArrowDown01Icon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Table } from "@tanstack/react-table";
import { getColumnLabel } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The "Actions" menu of a table toolbar (desktop): the other actions that are not filters. Today: show or hide
 * columns. Filters have their own "Filter" button next to the search, exactly like Nexus.
 */
export function FilterActionsMenu({
  table,
  disabled,
}: {
  // biome-ignore lint/suspicious/noExplicitAny: the menu only reads column ids, labels and visibility
  table: Table<any>;
  disabled?: boolean;
}) {
  const columns = table.getAllColumns().filter((column) => column.getCanHide());
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="gap-2 border-border bg-card font-normal shadow-xs hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50"
        >
          <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} className="text-muted-foreground" />
          Actions
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuLabel>Columns</DropdownMenuLabel>
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
          >
            {getColumnLabel(column)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
