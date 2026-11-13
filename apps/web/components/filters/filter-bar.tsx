"use client";

import { FilterIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";

import { DateFilterChip } from "@/components/filters/date-filter";
import { defineFilterFields } from "@/components/filters/fields";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters";
import { usedFieldIds } from "@/components/filters/tree";
import type { FilterFieldDef } from "@/components/filters/types";
import type { DateFilterState } from "@/components/filters/use-date-filter";
import type { FiltersState } from "@/components/filters/use-filters";
import { type FilterChangeDetails, Filters } from "@/components/reui/filters/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * The filter row of a page, built on ReUI Filters. Desktop: the fixed date chip, then one chip per filter and an
 * "Add filter" button. Phone: the date chip and one "Filters (N)" button that opens a bottom drawer. `search` and
 * `trailing` (view options, export) sit in the same row. Pages build `defs` and read `filters.values`; they never
 * touch the chips or the URL.
 */
export function FilterBar({
  defs,
  filters,
  date,
  search,
  trailing,
  disabled,
  className,
}: {
  defs: readonly FilterFieldDef[];
  filters: FiltersState;
  /** The page's required date filter. Omit on pages whose data has no date range. */
  date?: DateFilterState;
  search?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
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
        />
      )}
      {trailing ? <div className="ml-auto flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}
