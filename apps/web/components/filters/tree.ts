import { createFilterQuery, type FilterRule } from "@/components/reui/filters/filters";
import type { FilterFieldDef, FilterTree, FilterValue, FilterValues } from "./types";

export const OP_ANY_OF = "is_any_of";
export const OP_IS = "is";
export const OP_BETWEEN = "between";
export const OP_GTE = "gte";
export const OP_LTE = "lte";

type Rule = FilterRule<FilterValue>;

export function createEmptyTree(): FilterTree {
  return createFilterQuery<FilterValue>();
}

export function rulesOf(tree: FilterTree): Rule[] {
  return tree.rules.filter((node): node is Rule => node.type === "rule");
}

function hasValue(value: FilterValue | undefined): boolean {
  if (value === undefined || value === null || value === "") return false;
  if (Array.isArray(value)) return value.some((item) => item !== undefined && item !== "");
  return true;
}

/** A rule with an operator and a value; half-built chips never reach the URL or the API. */
export function isRuleComplete(rule: Rule): boolean {
  return Boolean(rule.operator) && hasValue(rule.value);
}

export function countActive(tree: FilterTree): number {
  return rulesOf(tree).filter(isRuleComplete).length;
}

/** `[[field, operator, value], ...]` as JSON: the whole filter state of a page in one URL parameter. */
export function encodeTree(tree: FilterTree): string | null {
  const rows = rulesOf(tree)
    .filter(isRuleComplete)
    .map((rule) => [rule.path[0], rule.operator, rule.value]);
  return rows.length > 0 ? JSON.stringify(rows) : null;
}

export function decodeTree(
  param: string | null | undefined,
  known?: ReadonlySet<string>,
): FilterTree {
  const tree = createEmptyTree();
  if (!param) return tree;
  try {
    const rows: unknown = JSON.parse(param);
    if (!Array.isArray(rows)) return tree;
    const rules: Rule[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || typeof row[0] !== "string" || typeof row[1] !== "string") continue;
      if (known && !known.has(row[0])) continue;
      rules.push({
        id: `u${rules.length}`,
        type: "rule",
        path: [row[0]],
        operator: row[1],
        value: row[2] as FilterValue,
      });
    }
    return { ...tree, rules };
  } catch {
    return tree;
  }
}

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function ruleFor(tree: FilterTree, id: string): Rule | undefined {
  return rulesOf(tree).find((rule) => rule.path[0] === id && isRuleComplete(rule));
}

/** Reads the active rules of a tree as plain values. */
export function readValues(tree: FilterTree): FilterValues {
  return {
    has: (id) => ruleFor(tree, id) !== undefined,
    list: (id) => {
      const rule = ruleFor(tree, id);
      if (!rule) return [];
      const items = Array.isArray(rule.value) ? rule.value : [rule.value];
      return items.filter((item) => item !== undefined).map(String);
    },
    flag: (id) => {
      const rule = ruleFor(tree, id);
      if (!rule) return null;
      return rule.value === "true";
    },
    money: (id) => {
      const rule = ruleFor(tree, id);
      if (!rule) return { min: null, max: null };
      if (rule.operator === OP_BETWEEN && Array.isArray(rule.value)) {
        return { min: toNumber(rule.value[0]), max: toNumber(rule.value[1]) };
      }
      const single = toNumber(rule.value);
      if (rule.operator === OP_LTE) return { min: null, max: single };
      return { min: single, max: null };
    },
    dates: (id) => {
      const rule = ruleFor(tree, id);
      if (!rule || !Array.isArray(rule.value)) return { from: null, to: null };
      const [from, to] = rule.value;
      return { from: from ? String(from) : null, to: to ? String(to) : null };
    },
  };
}

/** Replaces (or removes, when `next` is null) the one rule of a field. One filter per field. */
export function setFieldRule(
  tree: FilterTree,
  id: string,
  next: { operator: string; value: FilterValue } | null,
): FilterTree {
  const others = tree.rules.filter((node) => !(node.type === "rule" && node.path[0] === id));
  if (!next) return { ...tree, rules: others };
  const existing = rulesOf(tree).find((rule) => rule.path[0] === id);
  const rule: Rule = {
    id: existing?.id ?? `m${id}`,
    type: "rule",
    path: [id],
    operator: next.operator,
    value: next.value,
  };
  return { ...tree, rules: [...others, rule] };
}

/** The ids of fields that already have a chip (one filter per field). */
export function usedFieldIds(tree: FilterTree): Set<string> {
  return new Set(rulesOf(tree).map((rule) => rule.path[0] ?? ""));
}

/** Short summary of a field's rule for the mobile rows ("3 selected", "$10 - $50"). */
export function summarizeRule(
  def: FilterFieldDef,
  values: FilterValues,
  formatAmount: (amount: number) => string,
): string | null {
  if (!values.has(def.id)) return null;
  if (def.kind === "multiselect") {
    const picked = values.list(def.id);
    const labels = picked.map(
      (id) => def.options.find((option) => option.value === id)?.label ?? id,
    );
    return labels.length <= 2 ? labels.join(", ") : `${labels.length} selected`;
  }
  if (def.kind === "boolean") {
    return values.flag(def.id) ? (def.trueLabel ?? "Yes") : (def.falseLabel ?? "No");
  }
  if (def.kind === "money") {
    const { min, max } = values.money(def.id);
    if (min !== null && max !== null) return `${formatAmount(min)} - ${formatAmount(max)}`;
    if (min !== null) return `At least ${formatAmount(min)}`;
    return `At most ${formatAmount(max ?? 0)}`;
  }
  const { from, to } = values.dates(def.id);
  return [from, to].filter(Boolean).join(" - ");
}
