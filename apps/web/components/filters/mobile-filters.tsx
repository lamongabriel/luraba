"use client";

import { ArrowLeft01Icon, ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import {
  OP_ANY_OF,
  OP_BETWEEN,
  OP_GTE,
  OP_IS,
  OP_LTE,
  summarizeRule,
} from "@/components/filters/tree";
import type { FilterFieldDef, FilterValue } from "@/components/filters/types";
import type { FiltersState } from "@/components/filters/use-filters";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/masked-input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";

const ROW =
  "flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-[var(--color-container-inset)] px-3 py-2 text-left text-sm active:bg-accent";

function Screen({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
        <h3 className="min-w-0 truncate text-sm font-medium">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Choice({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      className={cn(ROW, "justify-between")}
      onClick={onClick}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected ? <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" /> : null}
    </button>
  );
}

function FieldScreen({
  def,
  filters,
  onBack,
}: {
  def: FilterFieldDef;
  filters: FiltersState;
  onBack: () => void;
}) {
  const { values, setField } = filters;
  const [search, setSearch] = React.useState("");

  if (def.kind === "multiselect") {
    const picked = values.list(def.id);
    const shown = def.options.filter((option) =>
      option.label.toLowerCase().includes(search.trim().toLowerCase()),
    );
    const toggle = (value: string) => {
      const next = picked.includes(value)
        ? picked.filter((item) => item !== value)
        : [...picked, value];
      setField(def.id, next.length > 0 ? { operator: OP_ANY_OF, value: next } : null);
    };
    return (
      <Screen title={def.label} onBack={onBack}>
        {def.options.length > 8 ? (
          <Input
            type="search"
            placeholder={`Search ${def.label.toLowerCase()}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        ) : null}
        <div role="listbox" aria-multiselectable className="flex flex-col gap-1.5">
          {shown.map((option) => (
            <Choice
              key={option.value}
              selected={picked.includes(option.value)}
              onClick={() => toggle(option.value)}
            >
              {option.label}
            </Choice>
          ))}
          {shown.length === 0 ? (
            <p className="px-1 py-3 text-center text-muted-foreground text-xs">No results.</p>
          ) : null}
        </div>
      </Screen>
    );
  }

  if (def.kind === "boolean") {
    const flag = values.flag(def.id);
    const set = (next: boolean | null) =>
      setField(def.id, next === null ? null : { operator: OP_IS, value: String(next) });
    return (
      <Screen title={def.label} onBack={onBack}>
        <div role="listbox" className="flex flex-col gap-1.5">
          <Choice selected={flag === null} onClick={() => set(null)}>
            Any
          </Choice>
          <Choice selected={flag === true} onClick={() => set(true)}>
            {def.trueLabel ?? "Yes"}
          </Choice>
          <Choice selected={flag === false} onClick={() => set(false)}>
            {def.falseLabel ?? "No"}
          </Choice>
        </div>
      </Screen>
    );
  }

  if (def.kind === "money") {
    const { min, max } = values.money(def.id);
    const update = (nextMin: number | null, nextMax: number | null) => {
      if (nextMin !== null && nextMax !== null) {
        setField(def.id, { operator: OP_BETWEEN, value: [nextMin, nextMax] });
      } else if (nextMin !== null) {
        setField(def.id, { operator: OP_GTE, value: nextMin });
      } else if (nextMax !== null) {
        setField(def.id, { operator: OP_LTE, value: nextMax });
      } else {
        setField(def.id, null);
      }
    };
    const parse = (raw: string) => (raw === "" ? null : Number(raw));
    return (
      <Screen title={def.label} onBack={onBack}>
        <div className="flex flex-col gap-1.5 text-xs">
          <span>Minimum</span>
          <MoneyInput
            aria-label={`Minimum ${def.label.toLowerCase()}`}
            value={min ?? ""}
            onValueChange={(raw) => update(parse(raw), max)}
          />
        </div>
        <div className="flex flex-col gap-1.5 text-xs">
          <span>Maximum</span>
          <MoneyInput
            aria-label={`Maximum ${def.label.toLowerCase()}`}
            value={max ?? ""}
            onValueChange={(raw) => update(min, parse(raw))}
          />
        </div>
      </Screen>
    );
  }

  const { from, to } = values.dates(def.id);
  const selected: DateRange | undefined =
    from || to ? { from: isoToCalendarDate(from), to: isoToCalendarDate(to) } : undefined;
  return (
    <Screen title={def.label} onBack={onBack}>
      <div className="flex justify-center">
        <Calendar
          captionLayout="dropdown"
          mode="range"
          selected={selected}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              setField(def.id, {
                operator: OP_BETWEEN,
                value: [calendarDateToIso(range.from), calendarDateToIso(range.to)] as FilterValue,
              });
            }
          }}
        />
      </div>
    </Screen>
  );
}

/**
 * The filters on a phone: one "Filters" button opens this bottom drawer with one row per field (current value on
 * the right), a field screen to change it, and Clear all / Done. It edits the same tree as the desktop chips, so the
 * URL, the API params and the empty states are identical. The date filter is not here: it is always visible beside the
 * button.
 */
export function MobileFiltersDrawer({
  open,
  onOpenChange,
  defs,
  filters,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defs: readonly FilterFieldDef[];
  filters: FiltersState;
}) {
  const [screen, setScreen] = React.useState<string | null>(null);
  const def = defs.find((item) => item.id === screen);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setScreen(null);
        onOpenChange(next);
      }}
    >
      <SheetContent showCloseButton={false}>
        <SheetHeader className="max-md:px-4 max-md:pt-1 max-md:pb-2">
          <SheetTitle className="text-base">Filters</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
          {def ? (
            <FieldScreen def={def} filters={filters} onBack={() => setScreen(null)} />
          ) : (
            defs.map((item) => {
              const summary = summarizeRule(item, filters.values, (amount) => amount.toFixed(2));
              return (
                <button
                  key={item.id}
                  type="button"
                  className={ROW}
                  onClick={() => setScreen(item.id)}
                >
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <span
                    className={cn(
                      "max-w-[50%] truncate text-xs",
                      summary ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {summary ?? "Any"}
                  </span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground"
                  />
                </button>
              );
            })
          )}
        </div>
        <SheetFooter className="max-md:sticky max-md:bottom-0 max-md:flex-col-reverse max-md:border-t max-md:bg-background max-md:px-4 max-md:pt-3 max-md:pb-7">
          {filters.activeCount > 0 && !def ? (
            <Button variant="outline" onClick={filters.clear}>
              Clear all
            </Button>
          ) : null}
          <Button onClick={() => (def ? setScreen(null) : onOpenChange(false))}>Done</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
