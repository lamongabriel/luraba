import { z } from "zod";

export const LANGUAGE_VALUES = ["en", "pt-BR"] as const;
export const DATE_FORMAT_VALUES = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export const PREFERRED_PERIOD_VALUES = [
  "last_day",
  "current_week",
  "last_7_days",
  "current_month",
  "last_month",
  "last_30_days",
  "last_90_days",
  "current_year",
  "last_365_days",
  "last_5_years",
  "last_10_years",
  "all_time",
] as const;
export const PREFERRED_THEME_VALUES = ["light", "dark", "system"] as const;
export const CREDIT_EXPENSE_TIMING_VALUES = ["spend_month", "payment_month"] as const;
export const CREDIT_INSTALLMENT_BUDGET_MODE_VALUES = ["per_installment", "full_amount"] as const;

export const languageSchema = z.enum(LANGUAGE_VALUES);
export const dateFormatSchema = z.enum(DATE_FORMAT_VALUES);
export const preferredPeriodSchema = z.enum(PREFERRED_PERIOD_VALUES);
export const preferredThemeSchema = z.enum(PREFERRED_THEME_VALUES);
export const creditExpenseTimingSchema = z.enum(CREDIT_EXPENSE_TIMING_VALUES);
export const creditInstallmentBudgetModeSchema = z.enum(CREDIT_INSTALLMENT_BUDGET_MODE_VALUES);
export const countryCodeSchema = z
  .string()
  .trim()
  .length(2)
  .transform((value) => value.toUpperCase());
export const timezoneSchema = z.string().trim().min(1).max(128);

export type Language = z.output<typeof languageSchema>;
export type DateFormat = z.output<typeof dateFormatSchema>;
export type PreferredPeriod = z.output<typeof preferredPeriodSchema>;
export type PreferredTheme = z.output<typeof preferredThemeSchema>;
export type CreditExpenseTiming = z.output<typeof creditExpenseTimingSchema>;
export type CreditInstallmentBudgetMode = z.output<typeof creditInstallmentBudgetModeSchema>;
export type CountryCode = z.output<typeof countryCodeSchema>;
