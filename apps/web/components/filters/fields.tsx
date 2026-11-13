"use client";

import type { DateRange } from "react-day-picker";

import { OP_ANY_OF, OP_BETWEEN, OP_GTE, OP_IS, OP_LTE } from "@/components/filters/tree";
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

/** Day-range editor on the shared calendar. */
function DateRangeEditor({
  value,
  onValueChange,
  commit,
  cancel,
  host,
  labels,
}: FilterEditorProps<FilterValue>) {
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

/**
 * Turns a page's field declarations into ReUI Filters fields. Every kind offers only what the list endpoints can
 * express: multiselect is "is any of", a flag is "is", an amount is at least / at most / between, a date is "between".
 */
export function defineFilterFields(defs: readonly FilterFieldDef[]): FilterFieldOf[] {
  return defs.map((def): FilterFieldOf => {
    const base = { id: def.id, label: def.label, icon: def.icon, className: "w-72" };
    switch (def.kind) {
      case "multiselect":
        return {
          ...base,
          type: "select",
          options: def.options,
          operators: [{ value: OP_ANY_OF, label: "is any of", arity: "many" }],
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
          operators: [{ value: OP_IS, label: "is" }],
          className: "w-44",
          searchable: false,
        };
      case "money":
        return {
          ...base,
          type: "number",
          editor: MoneyEditor,
          operators: [
            { value: OP_GTE, label: "is at least" },
            { value: OP_LTE, label: "is at most" },
            { value: OP_BETWEEN, label: "is between", arity: "range" },
          ],
        };
      default:
        return {
          ...base,
          type: "range",
          editor: DateRangeEditor,
          operators: [{ value: OP_BETWEEN, label: "is between", arity: "range" }],
        };
    }
  });
}
