"use client";

import { FilterAddIcon, FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Table } from "@tanstack/react-table";
import * as React from "react";

import { FilterActionsMenu } from "@/components/filters/actions-menu";
import { DateFilterChip } from "@/components/filters/date-filter";
import { defineFilterFields } from "@/components/filters/fields";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters";
import { usedFieldIds } from "@/components/filters/tree";
import type { FilterFieldDef } from "@/components/filters/types";
import type { DateFilterState } from "@/components/filters/use-date-filter";
import type { FiltersState } from "@/components/filters/use-filters";
import { type FilterChangeDetails, Filters, FiltersRow } from "@/components/reui/filters/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * The filter row of a page, built on ReUI Filters and laid out like Nexus's list toolbar.
 *
 * Desktop: ONE row. Left: the search and the "Filter" button (the add-filter popover); right: the fixed date filter,
 * then `trailing` (a "Clear" for the chips, the Actions menu...). The active chips wrap on their own line under it.
 * Phone: the date filter and one "Filters (N)" button that opens a bottom drawer (`MobileFiltersDrawer`). Pages build
 * `defs` and read `filters.values`; they never touch the chips or the URL.
 *
 * With `table`, the right group ends with an "Actions" menu (show or hide columns). On a phone the Filters button can
 * live elsewhere (a header icon): pass `mobileOpen` / `onMobileOpenChange` to own the drawer's state and
 * `mobileTrigger={false}` to hide the inline button.
 */
export function FilterBar({
  defs,
  filters,
  date,
  search,
  trailing,
  table,
  mobileOpen,
  onMobileOpenChange,
  mobileTrigger = true,
  disabled,
  className,
}: {
  defs: readonly FilterFieldDef[];
  filters: FiltersState;
  /** The page's required date filter. Omit on pages whose data has no date range. */
  date?: DateFilterState;
  search?: React.ReactNode;
  trailing?: React.ReactNode;
  /** The table whose columns the desktop "Actions" menu can toggle. */
  // biome-ignore lint/suspicious/noExplicitAny: only column ids, labels and visibility are read
  table?: Table<any>;
  /** Controlled state of the phone drawer (so a header button can open it). */
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  /** Show the inline "Filters" button on a phone. Default true. */
  mobileTrigger?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const [innerOpen, setInnerOpen] = React.useState(false);
  const drawerOpen = mobileOpen ?? innerOpen;
  const setDrawerOpen = onMobileOpenChange ?? setInnerOpen;
  const usedKey = [...usedFieldIds(filters.tree)].sort().join("|");
  const fields = React.useMemo(() => {
    const used = new Set(usedKey ? usedKey.split("|") : []);
    return defineFilterFields(defs).map((field) => ({ ...field, disabled: used.has(field.id) }));
  }, [defs, usedKey]);

  const beforeChange = React.useCallback(
    (next: typeof filters.tree, details: FilterChangeDetails<never, unknown>) => {
      if (details.reason === "remove" || details.reason === "clear") return true;
      // One filter per field.
      const seen = new Set<string>();
      for (const node of next.rules) {
        if (node.type !== "rule") continue;
        const id = node.path[0] ?? "";
        if (seen.has(id)) return false;
        seen.add(id);
      }
      return true;
    },
    [],
  );

  if (isMobile) {
    return (
      <div data-slot="filter-bar" className={cn("flex flex-wrap items-center gap-2", className)}>
        {search}
        {date ? <DateFilterChip date={date} disabled={disabled} /> : null}
        {mobileTrigger ? (
          <Button
            variant="outline"
            className="font-normal"
            disabled={disabled}
            onClick={() => setDrawerOpen(true)}
          >
            <HugeiconsIcon icon={FilterIcon} strokeWidth={2} />
            Filters
            {filters.activeCount > 0 ? (
              <Badge variant="secondary">{filters.activeCount}</Badge>
            ) : null}
          </Button>
        ) : null}
        <MobileFiltersDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          defs={defs}
          filters={filters}
        />
        {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
      </div>
    );
  }

  return (
    <Filters
      fields={fields}
      query={filters.tree}
      onQueryChange={filters.onQueryChange}
      onBeforeQueryChange={beforeChange as never}
      disabled={disabled}
      size="default"
      labels={{ addFilter: "Filter" }}
    >
      <div data-slot="filter-bar" className={cn("flex flex-wrap items-center gap-2", className)}>
        {search ? <div className="order-1 min-w-48 max-w-xs flex-1">{search}</div> : null}
        {/* The chip row's own add-filter popover, wearing our button: it sits right after the search. The chips are
            pushed onto the next line (`order-4`, full width, hidden while there are none). */}
        <FiltersRow
          className="contents [&>[role=toolbar]]:order-4 [&>[role=toolbar]]:basis-full [&>[role=toolbar]]:empty:hidden"
          trigger={
            <Button
              variant="outline"
              disabled={disabled}
              className="order-2 gap-2 border-border bg-card font-normal shadow-xs hover:bg-muted dark:bg-input/30 dark:hover:bg-input/50"
            >
              <HugeiconsIcon
                icon={FilterAddIcon}
                strokeWidth={2}
                className="text-muted-foreground"
              />
              Filter
              {filters.activeCount > 0 ? (
                <Badge variant="secondary">{filters.activeCount}</Badge>
              ) : null}
            </Button>
          }
        />
        <div className="order-3 ml-auto flex flex-wrap items-center justify-end gap-2">
          {filters.activeCount > 0 ? (
            <Button
              variant="ghost"
              disabled={disabled}
              className="font-normal text-muted-foreground"
              onClick={filters.clear}
            >
              Clear
            </Button>
          ) : null}
          {date ? <DateFilterChip date={date} disabled={disabled} /> : null}
          {table ? <FilterActionsMenu table={table} disabled={disabled} /> : null}
          {trailing}
        </div>
      </div>
    </Filters>
  );
}
