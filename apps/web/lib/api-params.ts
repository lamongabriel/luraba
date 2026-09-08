import { parseAsArrayOf, parseAsBoolean, parseAsFloat, parseAsInteger, parseAsString } from "nuqs";

export const DEFAULT_ARRAY_SEPARATOR = ",";

export type ApiParamFilterConfig =
  | { type: "boolean"; defaultValue?: boolean }
  | { type: "float"; defaultValue?: number }
  | { type: "floatArray"; defaultValue?: number[]; separator?: string }
  | { type: "integer"; defaultValue?: number }
  | { type: "integerArray"; defaultValue?: number[]; separator?: string }
  | { type: "string"; defaultValue?: string }
  | { type: "stringArray"; defaultValue?: string[]; separator?: string };

export type ApiParamFilterConfigs = Record<string, ApiParamFilterConfig>;

export type ApiParamFilterValue<TConfig extends ApiParamFilterConfig> =
  TConfig["type"] extends "string"
    ? string
    : TConfig["type"] extends "stringArray"
      ? string[]
      : TConfig["type"] extends "integerArray" | "floatArray"
        ? number[]
        : TConfig["type"] extends "integer" | "float"
          ? number | null
          : TConfig["type"] extends "boolean"
            ? boolean | null
            : never;

export type ApiParamFilterValues<TFilters extends ApiParamFilterConfigs> = {
  [Key in keyof TFilters]: ApiParamFilterValue<TFilters[Key]>;
};

export type ApiParamFilterUpdates<TFilters extends ApiParamFilterConfigs> = Partial<{
  [Key in keyof TFilters]: ApiParamFilterValues<TFilters>[Key] | null;
}>;

export type ApiParamValue = boolean | number | number[] | string | string[];

export function createApiFilterParser(config: ApiParamFilterConfig) {
  switch (config.type) {
    case "boolean":
      return config.defaultValue === undefined
        ? parseAsBoolean
        : parseAsBoolean.withDefault(config.defaultValue);
    case "float":
      return config.defaultValue === undefined
        ? parseAsFloat
        : parseAsFloat.withDefault(config.defaultValue);
    case "floatArray":
      return parseAsArrayOf(parseAsFloat, config.separator ?? DEFAULT_ARRAY_SEPARATOR).withDefault(
        config.defaultValue ?? [],
      );
    case "integer":
      return config.defaultValue === undefined
        ? parseAsInteger
        : parseAsInteger.withDefault(config.defaultValue);
    case "integerArray":
      return parseAsArrayOf(
        parseAsInteger,
        config.separator ?? DEFAULT_ARRAY_SEPARATOR,
      ).withDefault(config.defaultValue ?? []);
    case "string":
      return parseAsString.withDefault(config.defaultValue ?? "");
    case "stringArray":
      return parseAsArrayOf(parseAsString, config.separator ?? DEFAULT_ARRAY_SEPARATOR).withDefault(
        config.defaultValue ?? [],
      );
  }
}

export function normalizeFilterUpdateValue(value: unknown): ApiParamValue | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : null;
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null;
  }

  return (value as ApiParamValue | null | undefined) ?? null;
}

export function getEmptyFilterValue(value: unknown) {
  if (Array.isArray(value)) return [];
  if (typeof value === "string") return "";
  return null;
}

export function isActiveFilterValue(value: unknown, defaultValue: unknown) {
  if (Array.isArray(value)) {
    return value.length > 0 && !arraysEqual(value, defaultValue);
  }

  if (typeof value === "string") {
    return value.trim().length > 0 && value !== defaultValue;
  }

  return value !== null && value !== undefined && value !== defaultValue;
}

export function arraysEqual(left: unknown[], right: unknown) {
  return (
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}
