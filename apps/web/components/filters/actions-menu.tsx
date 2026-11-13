"use client";

import { ArrowDown01Icon, FilterAddIcon, Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Table } from "@tanstack/react-table";
import * as React from "react";

import { getColumnLabel } from "@/components/data-table/data-table-view-options";
import type { FilterFieldDef } from "@/components/filters/types";
import { useFilterActions } from "@/components/reui/filters/filters";
import { getFilterField, splitFilterPath } from "@/components/reui/filters/filters-lib";
import { getDefaultFilterOperator } from "@/components/reui/filters/filters-operators";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * The single "Actions" menu of a filtered table (desktop): "Add filter" (a field list; picking one adds the chip and
 * opens its value editor, exactly as the chips' own "Add filter" popover did) and "Columns" (show or hide). It replaces
 * the two separate Filters and Columns buttons. Must render inside the ReUI `Filters` provider, which `FilterBar`
 * guarantees.
 */
export function FilterActionsMenu({
  defs,
  table,
  disabled,
}: {
  defs: readonly FilterFieldDef[];
  /** The table whose columns can be toggled; omit for a filters-only menu. */
  // biome-ignore lint/suspicious/noExplicitAny: the menu only reads column ids, labels and visibility
  table?: Table<any>;
  disabled?: boolean;
}) {
  const actions = useFilterActions();
  const columns = table?.getAllColumns().filter((column) => column.getCanHide()) ?? [];

  const addFilter = React.useCallback(
    (id: string) => {
      const path = splitFilterPath(id);
      const field = getFilterField(actions.index, path);
      if (!field) return;
      actions.openCreate();
      actions.dispatchDraft({
        type: "selectField",
        path,
        defaultOperator: getDefaultFilterOperator(field, actions.resolveOperators(field)),
      });
    },
    [actions],
  );

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
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <HugeiconsIcon icon={FilterAddIcon} strokeWidth={2} />
            Add filter
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-44">
            {defs.map((def) => (
              <DropdownMenuItem
                key={def.id}
                // Let the menu close first, so the new chip's editor can take focus.
                onSelect={() => window.setTimeout(() => addFilter(def.id), 0)}
              >
                {def.icon}
                {def.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {columns.length > 0 ? (
          <>
            <DropdownMenuSeparator />
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
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
