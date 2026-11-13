"use client";

import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import * as React from "react";
import type { DateRange } from "react-day-picker";

import { defineFilterFields } from "@/components/filters/fields";
import { isRuleComplete, rulesOf } from "@/components/filters/tree";
import type {
  FilterFieldDef,
  FilterFieldOf,
  FilterTree,
  FilterValue,
} from "@/components/filters/types";
import type { FiltersState } from "@/components/filters/use-filters";
import {
  SidePanel,
  SidePanelBody,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@/components/side-panel/side-panel";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/masked-input";
import { calendarDateToIso, isoToCalendarDate } from "@/lib/calendar-date";
import { cn } from "@/lib/utils";

/** One row style for every tappable line of the drawer (Nexus's `DRAWER_ROW`). */
const ROW =
  "flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg border border-border bg-[var(--color-container-inset)] px-3 py-2 text-left text-sm active:bg-accent";

type Rule = ReturnType<typeof rulesOf>[number];
type Screen =
  | { name: "list" }
  | { name: "fields" }
  | { name: "operator"; ruleId: string }
  | { name: "value"; ruleId: string };

function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-1">
      {onBack ? (
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
        </Button>
      ) : null}
      <h3 className="min-w-0 truncate font-medium text-sm">{title}</h3>
    </div>
  );
}

function asList(value: FilterValue | undefined): string[] {
  if (value === undefined || value === null || value === "") return [];
  return (Array.isArray(value) ? value : [value])
    .filter((item) => item !== undefined && item !== "")
    .map(String);
}

/** "3 selected", "$10 - $50", "Nov 1 - Nov 30": what the rule's value says, short. */
function summarize(def: FilterFieldDef | undefined, rule: Rule): string {
  const items = asList(rule.value);
  if (items.length === 0) return "";
  if (def?.kind === "multiselect") {
    const labels = items.map(
      (id) => def.options.find((option) => option.value === id)?.label ?? id,
    );
    return labels.length > 2
      ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`
      : labels.join(", ");
  }
  if (def?.kind === "boolean") {
    return items[0] === "true" ? (def.trueLabel ?? "Yes") : (def.falseLabel ?? "No");
  }
  if (def?.kind === "money") return items.map((item) => Number(item).toFixed(2)).join(" - ");
  return items.join(" - ");
}

/**
 * The filters on a phone, ported from Nexus's `MobileQueryFilters`: ONE screen at a time inside a bottom drawer
 * (list, then field, operator and value), full-width tap rows, a fixed header and a FIXED footer ("Clear all" and
 * "Done"); only the body scrolls. It edits the same tree as the desktop chips and offers the same icons and operators
 * (`defineFilterFields`), so the URL, the API params and the empty states are identical.
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
  const [screen, setScreen] = React.useState<Screen>({ name: "list" });
  const fields = React.useMemo(() => defineFilterFields(defs), [defs]);
  const fieldById = React.useMemo(
    () => new Map(fields.map((field) => [field.id, field])),
    [fields],
  );
  const defById = React.useMemo(() => new Map(defs.map((def) => [def.id, def])), [defs]);
  const tree = filters.tree;
  const rules = rulesOf(tree);
  const used = new Set(rules.map((rule) => rule.path[0]));
  const ruleOf = (id: string) => rules.find((rule) => rule.id === id);

  const reset = (next: boolean) => {
    if (!next) setScreen({ name: "list" });
    onOpenChange(next);
  };
  const patchRule = (id: string, patch: Partial<Rule>) =>
    filters.onQueryChange({
      ...tree,
      rules: tree.rules.map((node) =>
        node.type === "rule" && node.id === id ? { ...node, ...patch } : node,
      ),
    } as FilterTree);
  const removeRule = (id: string) =>
    filters.onQueryChange({ ...tree, rules: tree.rules.filter((node) => node.id !== id) });
  const addRule = (field: FilterFieldOf) => {
    if (used.has(field.id)) return;
    const id = `m${Date.now().toString(36)}`;
    filters.onQueryChange({
      ...tree,
      rules: [
        ...tree.rules,
        { id, type: "rule", path: [field.id], operator: "", value: undefined } as Rule,
      ],
    });
    setScreen({ name: "operator", ruleId: id });
  };

  const rule =
    screen.name === "operator" || screen.name === "value" ? ruleOf(screen.ruleId) : undefined;
  const field = rule ? fieldById.get(rule.path[0] ?? "") : undefined;
  const operators = (Array.isArray(field?.operators) ? field.operators : []).filter(
    (operator) => !operator.hidden,
  );
  const operator = operators.find((candidate) => candidate.value === rule?.operator);

  let title = "Filters";
  let back: Screen | undefined;
  let content: React.ReactNode;

  if (screen.name === "fields") {
    title = "Add filter";
    back = { name: "list" };
    const free = fields.filter((item) => !used.has(item.id));
    content = (
      <div className="flex min-w-0 flex-col gap-2">
        {free.map((item) => (
          <button key={item.id} type="button" className={ROW} onClick={() => addRule(item)}>
            <span className="text-muted-foreground">{item.icon}</span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            <HugeiconsIcon
              icon={ArrowRight01Icon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
          </button>
        ))}
        {free.length === 0 ? (
          <p className="px-1 text-muted-foreground text-sm">
            Every filter is already set. Edit one from the list.
          </p>
        ) : null}
      </div>
    );
  } else if (rule && field && screen.name === "operator") {
    title = field.label;
    back = { name: "list" };
    content = (
      <div className="flex min-w-0 flex-col gap-2">
        {operators.map((item) => (
          <button
            key={item.value}
            type="button"
            className={cn(ROW, rule.operator === item.value && "border-primary")}
            onClick={() => {
              const needsValue = item.arity !== "none";
              // Changing the operator keeps the value when its shape still fits (any of -> none of), else clears it.
              const same = (operator?.arity ?? "one") === (item.arity ?? "one");
              patchRule(rule.id, {
                operator: item.value,
                value: same ? rule.value : undefined,
              });
              setScreen(needsValue ? { name: "value", ruleId: rule.id } : { name: "list" });
            }}
          >
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {rule.operator === item.value ? (
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4" />
            ) : null}
          </button>
        ))}
      </div>
    );
  } else if (rule && field && screen.name === "value") {
    title = `${field.label} ${operator?.label ?? ""}`.trim();
    back = { name: "operator", ruleId: rule.id };
    content = (
      <ValueEditor
        def={defById.get(field.id)}
        arity={operator?.arity ?? "one"}
        value={rule.value}
        onChange={(value) => patchRule(rule.id, { value })}
        onDone={() => setScreen({ name: "list" })}
      />
    );
  } else {
    content = (
      <div className="flex min-w-0 flex-col gap-2">
        {rules.map((item) => {
          const itemField = fieldById.get(item.path[0] ?? "");
          const itemOperator = (
            Array.isArray(itemField?.operators) ? itemField.operators : []
          ).find((candidate) => candidate.value === item.operator);
          const complete = isRuleComplete(item);
          return (
            <div key={item.id} className="flex min-w-0 items-stretch gap-1.5">
              <button
                type="button"
                data-slot="filter-row"
                className={cn(ROW, "flex-1 flex-col items-start gap-0.5")}
                onClick={() =>
                  setScreen(
                    item.operator
                      ? { name: "value", ruleId: item.id }
                      : { name: "operator", ruleId: item.id },
                  )
                }
              >
                <span className="flex w-full min-w-0 items-center gap-1.5 font-medium">
                  <span className="text-muted-foreground">{itemField?.icon}</span>
                  <span className="truncate">{itemField?.label ?? item.path.join(".")}</span>
                </span>
                <span
                  className={cn(
                    "w-full min-w-0 break-words text-xs",
                    complete ? "text-muted-foreground" : "text-destructive",
                  )}
                >
                  {complete
                    ? `${itemOperator?.label ?? item.operator} ${summarize(defById.get(item.path[0] ?? ""), item)}`
                    : "Incomplete: tap to finish"}
                </span>
              </button>
              <Button
                variant="outline"
                size="icon"
                className="h-auto w-11 shrink-0"
                aria-label={`Remove ${itemField?.label ?? "filter"}`}
                onClick={() => removeRule(item.id)}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </div>
          );
        })}
        <Button
          variant="outline"
          className="min-h-11 justify-start gap-2"
          disabled={fields.every((item) => used.has(item.id))}
          onClick={() => setScreen({ name: "fields" })}
        >
          <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
          Add filter
        </Button>
      </div>
    );
  }

  return (
    <SidePanel open={open} onOpenChange={reset}>
      <SidePanelContent>
        <SidePanelHeader>
          <SidePanelTitle className="text-base">Filters</SidePanelTitle>
        </SidePanelHeader>
        <SidePanelBody className="space-y-0">
          {screen.name === "list" ? null : (
            <ScreenHeader title={title} onBack={back ? () => setScreen(back) : undefined} />
          )}
          {content}
        </SidePanelBody>
        <SidePanelFooter className="flex flex-col gap-2">
          {filters.activeCount > 0 && screen.name === "list" ? (
            <Button variant="outline" onClick={filters.clear}>
              Clear all
            </Button>
          ) : null}
          <Button onClick={() => reset(false)}>Done</Button>
        </SidePanelFooter>
      </SidePanelContent>
    </SidePanel>
  );
}

function ValueEditor({
  def,
  arity,
  value,
  onChange,
  onDone,
}: {
  def: FilterFieldDef | undefined;
  arity: "none" | "one" | "many" | "range";
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
  onDone: () => void;
}) {
  if (!def) return null;
  if (def.kind === "multiselect" || def.kind === "boolean") {
    const options =
      def.kind === "boolean"
        ? [
            { value: "true", label: def.trueLabel ?? "Yes" },
            { value: "false", label: def.falseLabel ?? "No" },
          ]
        : def.options;
    return (
      <OptionsEditor
        options={options}
        multiple={arity === "many"}
        value={value}
        onChange={onChange}
        onDone={onDone}
        label={def.label}
      />
    );
  }

  if (def.kind === "money") {
    const pair = (Array.isArray(value) ? value : []) as Array<number | undefined>;
    const parse = (raw: string) => (raw === "" ? undefined : Number(raw));
    if (arity === "range") {
      return (
        <div className="flex min-w-0 flex-col gap-3">
          <MoneyInput
            aria-label={`${def.label} from`}
            value={pair[0] ?? ""}
            onValueChange={(raw) => onChange([parse(raw), pair[1]] as FilterValue)}
          />
          <MoneyInput
            aria-label={`${def.label} to`}
            value={pair[1] ?? ""}
            onValueChange={(raw) => onChange([pair[0], parse(raw)] as FilterValue)}
          />
          <Button
            className="min-h-11"
            disabled={pair[0] === undefined || pair[1] === undefined}
            onClick={onDone}
          >
            Apply
          </Button>
        </div>
      );
    }
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <MoneyInput
          aria-label={def.label}
          value={typeof value === "number" ? value : ""}
          onValueChange={(raw) => onChange(parse(raw) as FilterValue | undefined)}
        />
        <Button className="min-h-11" disabled={typeof value !== "number"} onClick={onDone}>
          Apply
        </Button>
      </div>
    );
  }

  // Dates: the shared calendar, one day or a range; a finished pick is applied at once.
  if (arity === "range") {
    const pair = (Array.isArray(value) ? value : []) as Array<string | undefined>;
    const selected: DateRange | undefined =
      pair[0] || pair[1]
        ? { from: isoToCalendarDate(pair[0]), to: isoToCalendarDate(pair[1]) }
        : undefined;
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 justify-center">
          <Calendar
            captionLayout="dropdown"
            mode="range"
            selected={selected}
            defaultMonth={selected?.from}
            onSelect={(range) =>
              onChange([
                range?.from ? calendarDateToIso(range.from) : undefined,
                range?.to ? calendarDateToIso(range.to) : undefined,
              ] as FilterValue)
            }
          />
        </div>
        <Button className="min-h-11" disabled={!(pair[0] && pair[1])} onClick={onDone}>
          Apply
        </Button>
      </div>
    );
  }
  const day = typeof value === "string" ? isoToCalendarDate(value) : undefined;
  return (
    <div className="flex min-w-0 justify-center">
      <Calendar
        captionLayout="dropdown"
        mode="single"
        selected={day}
        defaultMonth={day}
        onSelect={(picked) => {
          if (!picked) return;
          onChange(calendarDateToIso(picked));
          onDone();
        }}
      />
    </div>
  );
}

function OptionsEditor({
  options,
  multiple,
  value,
  onChange,
  onDone,
  label,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  multiple: boolean;
  value: FilterValue | undefined;
  onChange: (value: FilterValue | undefined) => void;
  onDone: () => void;
  label: string;
}) {
  const [search, setSearch] = React.useState("");
  const selected = asList(value);
  const shown = options.filter((option) =>
    option.label.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const toggle = (optionValue: string) => {
    if (!multiple) {
      onChange(optionValue);
      onDone();
      return;
    }
    const next = selected.includes(optionValue)
      ? selected.filter((item) => item !== optionValue)
      : [...selected, optionValue];
    onChange(next.length > 0 ? next : undefined);
  };
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {options.length > 6 ? (
        <Input
          type="search"
          className="h-11"
          placeholder={`Search ${label.toLowerCase()}...`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      ) : null}
      {shown.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground text-sm">No results</p>
      ) : (
        shown.map((option) => {
          const on = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={on}
              className={cn(ROW, on && "border-primary")}
              onClick={() => toggle(option.value)}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {on ? (
                <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} className="size-4 shrink-0" />
              ) : null}
            </button>
          );
        })
      )}
    </div>
  );
}
