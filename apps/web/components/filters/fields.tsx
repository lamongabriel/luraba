"use client";

import { Calendar01Icon, Menu01Icon, ToggleOnIcon, Wallet01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createElement } from "react";
import type { DateRange } from "react-day-picker";
import {
  OP_AFTER,
  OP_ANY_OF,
  OP_BEFORE,
  OP_BETWEEN,
  OP_EQ,
  OP_GT,
  OP_GTE,
  OP_IS,
  OP_IS_NOT,
  OP_LT,
  OP_LTE,
  OP_NONE_OF,
  OP_ON_OR_AFTER,
  OP_ON_OR_BEFORE,
} from "@/components/filters/tree";
import type { FilterFieldDef, FilterFieldOf, FilterValue } from "@/components/filters/types";
import type { FilterEditorProps } from "@/components/reui/filters/filters";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { MoneyInput } from "@/components/ui/masked-input";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/calendar-date";

function EditorActions({
  commit,
  cancel,
  host,
  labels,
  disabled,
}: Pick<FilterEditorProps<FilterValue>, "commit" | "cancel" | "host" | "labels"> & {
  disabled?: boolean;
}) {
  if (host === "create") {
    return (
      <div className="flex justify-end">
        <Button size="sm" disabled={disabled} onClick={() => commit()}>
          {labels.apply}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button variant="ghost" size="sm" onClick={cancel}>
        {labels.discard}
      </Button>
      <Button size="sm" disabled={disabled} onClick={() => commit()}>
        {labels.apply}
      </Button>
    </div>
  );
}

/** Amount editor: one box for "at least" / "at most", two for "between". Major units, never `type="number"`. */
function MoneyEditor({
  value,
  onValueChange,
  operator,
  commit,
  cancel,
  host,
  labels,
  field,
}: FilterEditorProps<FilterValue>) {
  const range = operator.arity === "range";
  const tuple = (Array.isArray(value) ? value : []) as Array<number | undefined>;
  const set = (index: 0 | 1, raw: string) => {
    const parsed = raw === "" ? undefined : Number(raw);
    const next = [tuple[0], tuple[1]];
    next[index] = parsed;
    onValueChange(next as FilterValue);
  };
  const complete = range
    ? tuple[0] !== undefined && tuple[1] !== undefined
    : typeof value === "number";
  return (
    <div data-slot="filter-editor" className="flex w-64 flex-col gap-2 p-2">
      {range ? (
        <div className="flex items-center gap-1.5">
          <MoneyInput
            autoFocus
            aria-label={labels.rangeFrom(field.label)}
            value={tuple[0] ?? ""}
            onValueChange={(raw) => set(0, raw)}
          />
          <span className="text-muted-foreground text-xs">{labels.rangeSeparator}</span>
          <MoneyInput
            aria-label={labels.rangeTo(field.label)}
            value={tuple[1] ?? ""}
            onValueChange={(raw) => set(1, raw)}
          />
        </div>
      ) : (
        <MoneyInput
          autoFocus
          aria-label={field.label}
          value={typeof value === "number" ? value : ""}
          onValueChange={(raw) =>
            onValueChange((raw === "" ? undefined : Number(raw)) as FilterValue)
          }
        />
      )}
      <EditorActions
        commit={commit}
        cancel={cancel}
        host={host}
        labels={labels}
        disabled={!complete}
      />
    </div>
  );
}

/** Date editor on the shared calendar: one day ("is", "is before"...) or a day range ("is between"). */
function DateEditor({
  value,
  onValueChange,
  operator,
  commit,
  cancel,
  host,
  labels,
}: FilterEditorProps<FilterValue>) {
  if (operator.arity !== "range") {
    const day = typeof value === "string" ? value : undefined;
    return (
      <div data-slot="filter-editor" className="flex flex-col gap-2 p-2">
        <Calendar
          autoFocus
          captionLayout="dropdown"
          mode="single"
          selected={isoToCalendarDate(day)}
          defaultMonth={isoToCalendarDate(day)}
          onSelect={(picked) => onValueChange(picked ? calendarDateToIso(picked) : undefined)}
        />
        <EditorActions
          commit={commit}
          cancel={cancel}
          host={host}
          labels={labels}
          disabled={!day}
        />
      </div>
    );
  }
  const tuple = (Array.isArray(value) ? value : []) as Array<string | undefined>;
  const selected: DateRange | undefined =
    tuple[0] || tuple[1]
      ? { from: isoToCalendarDate(tuple[0]), to: isoToCalendarDate(tuple[1]) }
      : undefined;
  return (
    <div data-slot="filter-editor" className="flex flex-col gap-2 p-2">
      <Calendar
        autoFocus
        captionLayout="dropdown"
        mode="range"
        selected={selected}
        onSelect={(range) =>
          onValueChange([
            range?.from ? calendarDateToIso(range.from) : undefined,
            range?.to ? calendarDateToIso(range.to) : undefined,
          ] as FilterValue)
        }
      />
      <EditorActions
        commit={commit}
        cancel={cancel}
        host={host}
        labels={labels}
        disabled={!(tuple[0] && tuple[1])}
      />
    </div>
  );
}

const fieldIcon = (icon: Parameters<typeof HugeiconsIcon>[0]["icon"]) =>
  createElement(HugeiconsIcon, { icon, strokeWidth: 2, className: "size-3.5" });

/** Every chip has an icon: the page's own, else one per field kind. */
const DEFAULT_ICON = {
  multiselect: fieldIcon(Menu01Icon),
  boolean: fieldIcon(ToggleOnIcon),
  money: fieldIcon(Wallet01Icon),
  date: fieldIcon(Calendar01Icon),
} as const;

/**
 * Turns a page's field declarations into ReUI Filters fields, with the operators Nexus offers per kind (the page
 * reads them back through `readValues`, which turns each one into the list endpoint's params):
 * - pick list: is any of, is none of, is, is not;
 * - flag: is, is not;
 * - amount: equals, greater than, at least, less than, at most, between;
 * - date: is, is before, is after, is on or before, is on or after, is between.
 * A pick list with no options is dropped: a chip nobody can fill in is noise.
 */
export function defineFilterFields(defs: readonly FilterFieldDef[]): FilterFieldOf[] {
  return defs
    .filter((def) => def.kind !== "multiselect" || def.options.length > 0)
    .map((def): FilterFieldOf => {
      const base = {
        id: def.id,
        label: def.label,
        icon: def.icon ?? DEFAULT_ICON[def.kind],
        className: "w-72",
      };
      switch (def.kind) {
        case "multiselect":
          return {
            ...base,
            type: "select",
            options: def.options,
            operators: [
              { value: OP_ANY_OF, label: "is any of", arity: "many", inverse: OP_NONE_OF },
              { value: OP_NONE_OF, label: "is none of", arity: "many", inverse: OP_ANY_OF },
              { value: OP_IS, label: "is", inverse: OP_IS_NOT },
              { value: OP_IS_NOT, label: "is not", inverse: OP_IS },
            ],
            pinSelected: false,
          };
        case "boolean":
          return {
            ...base,
            type: "select",
            options: [
              { value: "true", label: def.trueLabel ?? "Yes" },
              { value: "false", label: def.falseLabel ?? "No" },
            ],
            operators: [
              { value: OP_IS, label: "is", inverse: OP_IS_NOT },
              { value: OP_IS_NOT, label: "is not", inverse: OP_IS },
            ],
            className: "w-44",
            searchable: false,
          };
        case "money":
          return {
            ...base,
            type: "number",
            editor: MoneyEditor,
            operators: [
              { value: OP_EQ, label: "equals" },
              { value: OP_GT, label: "is greater than" },
              { value: OP_GTE, label: "is at least" },
              { value: OP_LT, label: "is less than" },
              { value: OP_LTE, label: "is at most" },
              { value: OP_BETWEEN, label: "is between", arity: "range" },
            ],
          };
        default:
          return {
            ...base,
            type: "range",
            editor: DateEditor,
            operators: [
              { value: OP_IS, label: "is" },
              { value: OP_BEFORE, label: "is before" },
              { value: OP_AFTER, label: "is after" },
              { value: OP_ON_OR_BEFORE, label: "is on or before" },
              { value: OP_ON_OR_AFTER, label: "is on or after" },
              { value: OP_BETWEEN, label: "is between", arity: "range" },
            ],
          };
      }
    });
}
