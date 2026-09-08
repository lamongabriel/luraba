import { formatISODateTime } from "@luraba/domain";

type QueryValue =
  | boolean
  | Date
  | number
  | string
  | readonly (boolean | Date | number | string)[]
  | null
  | undefined;

function serializeValue(value: Exclude<QueryValue, readonly unknown[] | null | undefined>) {
  if (value instanceof Date) return formatISODateTime(value);
  return value;
}

export function serializeHttpQuery(query: object) {
  return Object.fromEntries(
    Object.entries(query as Record<string, QueryValue>).flatMap(([key, value]) => {
      if (value === undefined || value === null || value === "") return [];

      if (Array.isArray(value)) {
        if (value.length === 0) return [];
        return [[key, value.map(serializeValue).join(",")]];
      }

      return [
        [key, serializeValue(value as Exclude<QueryValue, readonly unknown[] | null | undefined>)],
      ];
    }),
  );
}
