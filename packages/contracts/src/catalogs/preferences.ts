import type { DateFormat, Language, PreferredPeriod, PreferredTheme } from "../preferences.js";

import { catalogOptions } from "./types.js";

/**
 * Labels for the user-preference enums. The values live in `@luraba/contracts`; typed as full
 * `Record`s so adding a value there fails to compile until it has a label here.
 */

export const LANGUAGE_CATALOG: Record<
  Language,
  { label: string; nativeLabel: string; countryCode: string }
> = {
  en: { label: "English", nativeLabel: "English", countryCode: "US" },
  "pt-BR": { label: "Portuguese (Brazil)", nativeLabel: "Português (Brasil)", countryCode: "BR" },
};

export const DATE_FORMAT_CATALOG: Record<DateFormat, { label: string; example: string }> = {
  "MM/DD/YYYY": { label: "Month / Day / Year", example: "03/25/2026" },
  "DD/MM/YYYY": { label: "Day / Month / Year", example: "25/03/2026" },
  "YYYY-MM-DD": { label: "Year - Month - Day", example: "2026-03-25" },
};

export const PREFERRED_PERIOD_CATALOG: Record<PreferredPeriod, { label: string }> = {
  last_day: { label: "Last day" },
  current_week: { label: "This week" },
  last_7_days: { label: "Last 7 days" },
  current_month: { label: "This month" },
  last_month: { label: "Last month" },
  last_30_days: { label: "Last 30 days" },
  last_90_days: { label: "Last 90 days" },
  current_year: { label: "This year" },
  last_365_days: { label: "Last 365 days" },
  last_5_years: { label: "Last 5 years" },
  last_10_years: { label: "Last 10 years" },
  all_time: { label: "All time" },
};

export const PREFERRED_THEME_CATALOG: Record<PreferredTheme, { label: string }> = {
  system: { label: "System" },
  light: { label: "Light" },
  dark: { label: "Dark" },
};

export const LANGUAGE_OPTIONS = catalogOptions(LANGUAGE_CATALOG);
export const DATE_FORMAT_OPTIONS = catalogOptions(DATE_FORMAT_CATALOG);
export const PREFERRED_PERIOD_OPTIONS = catalogOptions(PREFERRED_PERIOD_CATALOG);
export const PREFERRED_THEME_OPTIONS = catalogOptions(PREFERRED_THEME_CATALOG);
