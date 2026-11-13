"use client";

import { PREFERRED_PERIOD_CATALOG } from "@luraba/contracts";
import { formatShortDate, getPreferredDateRange, type PreferredPeriod } from "@luraba/domain";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import * as React from "react";

import { useAuthSessionStore } from "@/stores/auth-session-store";

const URL_OPTIONS = { clearOnDefault: true, shallow: true } as const;
const FALLBACK_PERIOD: PreferredPeriod = "last_30_days";

export type DatePeriod = PreferredPeriod | "custom";

function scoped(prefix: string | undefined, key: string) {
  return prefix ? `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
}

/**
 * The required, fixed date filter of a page: always applied, never removable, only editable. It starts on the
 * user's default period (Settings > Preferences) and lives in the URL as `?period=` (a preset that is not the
 * default) or `?dateFrom=&dateTo=` (days picked on the calendar). `ready` is false until the preferences are loaded,
 * so a list never fires a first request with the wrong dates.
 */
export function useDateFilter({ keyPrefix }: { keyPrefix?: string } = {}) {
  const bootstrapStatus = useAuthSessionStore((state) => state.bootstrapStatus);
  const preferences = useAuthSessionStore((state) => state.user?.preferences);
  const timezone = preferences?.timezone ?? "UTC";
  const preferred =
    (preferences?.preferredPeriod as PreferredPeriod | undefined) ?? FALLBACK_PERIOD;
  const language = preferences?.language ?? "en";

  const [periodParam, setPeriodParam] = useQueryState(
    scoped(keyPrefix, "period"),
    parseAsString.withOptions(URL_OPTIONS),
  );
  const [fromParam, setFromParam] = useQueryState(
    scoped(keyPrefix, "dateFrom"),
    parseAsString.withOptions(URL_OPTIONS),
  );
  const [toParam, setToParam] = useQueryState(
    scoped(keyPrefix, "dateTo"),
    parseAsString.withOptions(URL_OPTIONS),
  );
  const [, setPage] = useQueryState(
    scoped(keyPrefix, "page"),
    parseAsInteger.withDefault(1).withOptions(URL_OPTIONS),
  );

  const custom = Boolean(fromParam || toParam);
  const preset: PreferredPeriod =
    periodParam && periodParam in PREFERRED_PERIOD_CATALOG
      ? (periodParam as PreferredPeriod)
      : preferred;
  const range = React.useMemo(
    () =>
      custom
        ? { dateFrom: fromParam ?? undefined, dateTo: toParam ?? undefined }
        : getPreferredDateRange(preset, timezone),
    [custom, fromParam, toParam, preset, timezone],
  );
  const period: DatePeriod = custom ? "custom" : preset;

  const label =
    period === "custom"
      ? [range.dateFrom, range.dateTo]
          .filter((day): day is string => Boolean(day))
          .map((day) => formatShortDate(day, language))
          .join(" - ") || "Custom range"
      : PREFERRED_PERIOD_CATALOG[preset].label;

  const setPreset = React.useCallback(
    (next: PreferredPeriod) => {
      void setFromParam(null);
      void setToParam(null);
      void setPeriodParam(next === preferred ? null : next);
      void setPage(null);
    },
    [preferred, setFromParam, setToParam, setPeriodParam, setPage],
  );
  const setRange = React.useCallback(
    (dateFrom: string | undefined, dateTo: string | undefined) => {
      void setPeriodParam(null);
      void setFromParam(dateFrom ?? null);
      void setToParam(dateTo ?? null);
      void setPage(null);
    },
    [setPeriodParam, setFromParam, setToParam, setPage],
  );

  return {
    period,
    label,
    /** `YYYY-MM-DD`, undefined for an open end (`all_time`). */
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    ready: bootstrapStatus === "authenticated" && Boolean(preferences),
    setPreset,
    setRange,
    language,
  };
}

export type DateFilterState = ReturnType<typeof useDateFilter>;
