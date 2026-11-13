import type { FilterField, FilterQuery } from "@/components/reui/filters/filters";

/** What a filter rule holds: a pick, a flag as `"true"`/`"false"`, an amount, or a `[from, to]` / list. */
export type FilterValue = string | number | Array<string | number | undefined>;

/** The tree the ReUI component edits (ids, operators, incomplete rules and all). */
export type FilterTree = FilterQuery<FilterValue>;

/** A ReUI field with our value type fixed. */
export type FilterFieldOf = FilterField<FilterValue, unknown>;

export interface FilterOptionDef {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

type FieldBase = {
  /** The field id; also the key in the URL and in `FilterValues`. */
  id: string;
  label: string;
  icon?: React.ReactNode;
};

/** What a page declares per filterable column; `defineFilterFields` turns these into ReUI fields. */
export type FilterFieldDef =
  /** Pick any of a list of options ("is any of"). */
  | (FieldBase & { kind: "multiselect"; options: FilterOptionDef[] })
  /** Yes or no ("is Yes"). */
  | (FieldBase & { kind: "boolean"; trueLabel?: string; falseLabel?: string })
  /** An amount in major units: at least, at most, or between. */
  | (FieldBase & { kind: "money" })
  /** A day range ("between"). */
  | (FieldBase & { kind: "date" });

/** The active filters of a page by field id, as plain values for building API params. */
export interface FilterValues {
  /** The ids picked for a `multiselect` field, `[]` when unset. */
  list: (id: string) => string[];
  /** The ids of an "is not" / "is none of" rule, `[]` when unset. */
  excluded: (id: string) => string[];
  /** `true` / `false` for a `boolean` field, `null` when unset. */
  flag: (id: string) => boolean | null;
  /** Minimum and maximum of a `money` field in major units; the flags mark "greater than" / "less than". */
  money: (id: string) => {
    min: number | null;
    max: number | null;
    minExclusive?: boolean;
    maxExclusive?: boolean;
  };
  /** `from` / `to` days of a `date` field. */
  dates: (id: string) => { from: string | null; to: string | null };
  /** Whether the field has a complete rule. */
  has: (id: string) => boolean;
}
