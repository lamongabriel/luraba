"use client";

import { FilterIcon } from "@hugeicons/core-free-icons";
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
 * The filter row of a page, built on ReUI Filters. Desktop: the fixed date chip, then one chip per filter and an
 * "Add filter" button. Phone: the date chip and one "Filters (N)" button that opens a bottom drawer. `search` and
 * `trailing` (view options, export) sit in the same row. Pages build `defs` and read `filters.values`; they never
 * touch the chips or the URL.
 *
 * With `table`, the desktop row has one "Actions" menu (add a filter, show or hide columns) instead of the separate
 * Filters button and column control. On a phone the Filters button can live elsewhere (a header icon): pass
 * `mobileOpen` / `onMobileOpenChange` to own the drawer's state and `mobileTrigger={false}` to hide the inline button.
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
  /** The table whose columns the desktop "Actions" menu can toggle; also switches to the Actions menu. */
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

  return (
    <div data-slot="filter-bar" className={cn("flex flex-wrap items-center gap-2", className)}>
      {search}
      {date ? <DateFilterChip date={date} disabled={disabled} /> : null}
      {isMobile ? (
        <>
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
        </>
      ) : (
        <Filters
          fields={fields}
          query={filters.tree}
          onQueryChange={filters.onQueryChange}
          onBeforeQueryChange={beforeChange as never}
          disabled={disabled}
          showClear
          size="default"
          labels={{ addFilter: "Filters" }}
        >
          {table ? (
            <>
              <FilterActionsMenu defs={defs} table={table} disabled={disabled} />
              {/* The chips' own Add filter popover is replaced by the Actions menu. */}
              <FiltersRow showClear trigger={<span aria-hidden="true" className="sr-only" />} />
            </>
          ) : undefined}
        </Filters>
      )}
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
