"use client";

import { parseAsString, useQueryState } from "nuqs";
import * as React from "react";

import { currentMonthKey } from "@/lib/credit-card-invoices";
import { useAuthSessionStore } from "@/stores/auth-session-store";

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * The month of a month-based page (Budgets, Bills): `?month=YYYY-MM` in the URL, the current month in the
 * user's time zone when absent or invalid. Render it with `MonthPresetButton`.
 */
export function useMonthFilter() {
  const timezone = useAuthSessionStore((state) => state.user?.preferences.timezone ?? "UTC");
  const language = useAuthSessionStore((state) => state.user?.preferences.language ?? "en");
  const [param, setParam] = useQueryState(
    "month",
    parseAsString.withOptions({ clearOnDefault: false, shallow: true }),
  );
  const current = currentMonthKey(timezone);
  const month = param && MONTH_KEY.test(param) ? param : current;
  const setMonth = React.useCallback(
    (next: string) => void setParam(next === current ? null : next),
    [setParam, current],
  );
  return { month, setMonth, timezone, language, isCurrent: month === current };
}
