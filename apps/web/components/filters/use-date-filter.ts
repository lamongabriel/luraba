"use client";

import { PREFERRED_PERIOD_CATALOG } from "@luraba/contracts";
import {
  formatShortDate,
  getMonthRangeWithOpenCycles,
  getPreferredDateRange,
  type PreferredPeriod,
} from "@luraba/domain";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import * as React from "react";

import { useOpenCycleStarts } from "@/queries/credit-cards/use-open-cycle-starts-query";
import { useAuthSessionStore } from "@/stores/auth-session-store";

const URL_OPTIONS = { clearOnDefault: true, shallow: true } as const;
const FALLBACK_PERIOD: PreferredPeriod = "last_30_days";

export type DatePeriod = PreferredPeriod | "custom";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const isIsoDay = (value: string | null): value is string => value !== null && ISO_DAY.test(value);

function scoped(prefix: string | undefined, key: string) {
  return prefix ? `${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
}

/**
 * The required, fixed date filter of a page: always applied, never removable, only editable. It starts on the
 * page's `defaultPeriod` (else the user's default period in Settings > Preferences) and lives in the URL as
 * `?period=` (a preset that is not the default) or `?dateFrom=&dateTo=` (days picked on the calendar). A malformed
 * URL value falls back to the default, so there is never a state without a range.
 *
 * The default is computed synchronously from the preferences, so the first render already has it (also on a hard
 * reload and with URL params); `ready` only gates the list request, never the filter's presence.
 *
 * `billingCycles` is for pages that list card purchases: the "This month" preset then runs from the earliest open
 * billing-cycle start (or the 1st, whichever is earlier) through the end of the month, so the open cycle is covered.
 * `ready` also waits for the cards' cycles (see `useOpenCycleStarts`).
 */
export function useDateFilter({
  keyPrefix,
  defaultPeriod,
  billingCycles = false,
}: {
  keyPrefix?: string;
  defaultPeriod?: PreferredPeriod;
  billingCycles?: boolean;
} = {}) {
  const bootstrapStatus = useAuthSessionStore((state) => state.bootstrapStatus);
  const preferences = useAuthSessionStore((state) => state.user?.preferences);
  const timezone = preferences?.timezone ?? "UTC";
  const preferred =
    defaultPeriod ??
    (preferences?.preferredPeriod as PreferredPeriod | undefined) ??
    FALLBACK_PERIOD;
  const language = preferences?.language ?? "en";
  const authenticated = bootstrapStatus === "authenticated" && Boolean(preferences);
  const cycles = useOpenCycleStarts({ enabled: billingCycles && authenticated });
  const cycleKey = cycles.starts.join("|");

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

  const from = isIsoDay(fromParam) ? fromParam : undefined;
  const to = isIsoDay(toParam) ? toParam : undefined;
  const custom = Boolean(from || to);
  const preset: PreferredPeriod =
    periodParam && periodParam in PREFERRED_PERIOD_CATALOG
      ? (periodParam as PreferredPeriod)
      : preferred;
  const range = React.useMemo(() => {
    if (custom) return { dateFrom: from, dateTo: to };
    if (billingCycles && preset === "current_month") {
      return getMonthRangeWithOpenCycles(timezone, cycleKey ? cycleKey.split("|") : []);
    }
    return getPreferredDateRange(preset, timezone);
  }, [custom, from, to, preset, timezone, billingCycles, cycleKey]);
  const period: DatePeriod = custom ? "custom" : preset;

  const rangeText =
    [range.dateFrom, range.dateTo]
      .filter((day): day is string => Boolean(day))
      .map((day) => formatShortDate(day, language))
      .join(" - ") || null;
  const label =
    period === "custom" ? (rangeText ?? "Custom range") : PREFERRED_PERIOD_CATALOG[preset].label;

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
    /** The days the preset or custom range covers ("Oct 27 - Nov 30"); null for "All time". */
    rangeText,
    /** `YYYY-MM-DD`, undefined for an open end (`all_time`). */
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    /** The range is final: preferences loaded (and, with `billingCycles`, the cards' open cycles known). */
    ready: authenticated && (!billingCycles || cycles.ready),
    setPreset,
    setRange,
    language,
  };
}

export type DateFilterState = ReturnType<typeof useDateFilter>;
