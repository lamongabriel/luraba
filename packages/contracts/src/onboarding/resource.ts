import { z } from "zod";
import {
  creditExpenseTimingSchema,
  creditInstallmentBudgetModeSchema,
  dateFormatSchema,
  languageSchema,
  preferredPeriodSchema,
  preferredThemeSchema,
} from "../preferences.js";

export const onboardingCurrencyOptionSchema = z.object({
  code: z.string().length(3),
  symbol: z.string(),
  precision: z.number().int().nonnegative(),
});

export const onboardingOptionsResponseSchema = z.object({
  languages: z.array(languageSchema),
  currencies: z.array(onboardingCurrencyOptionSchema),
  timezones: z.array(z.string().min(1)),
  dateFormats: z.array(dateFormatSchema),
  preferredPeriods: z.array(preferredPeriodSchema),
  preferredThemes: z.array(preferredThemeSchema),
  countryCodes: z.array(z.string().regex(/^[A-Z]{2}$/)),
  creditExpenseTimings: z.array(creditExpenseTimingSchema),
  creditInstallmentBudgetModes: z.array(creditInstallmentBudgetModeSchema),
  budgetMonthStartDays: z.array(z.number().int().min(1).max(31)),
});

export type OnboardingCurrencyOption = z.output<typeof onboardingCurrencyOptionSchema>;
export type OnboardingOptionsResponse = z.output<typeof onboardingOptionsResponseSchema>;
