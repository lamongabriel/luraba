import { z } from "zod";
import { currencyCodeSchema, wireDateTimeSchema } from "../common.js";
import { householdSettingsSchema } from "../households/resource.js";
import { householdPermissionSchema, householdRoleSchema } from "../permissions.js";
import {
  dateFormatSchema,
  languageSchema,
  preferredPeriodSchema,
  preferredThemeSchema,
  timezoneSchema,
} from "../preferences.js";

export const userPreferencesSchema = z.object({
  language: languageSchema,
  currency: currencyCodeSchema,
  timezone: timezoneSchema,
  dateFormat: dateFormatSchema,
  preferredPeriod: preferredPeriodSchema,
  preferredTheme: preferredThemeSchema,
});
/** Who the user is, beyond name and email (name and picture are edited through Better Auth). */
export const userProfileSchema = z.object({
  phoneNumber: z.string().nullable(),
  countryCode: z.string().length(2).nullable(),
  /** ISO date (YYYY-MM-DD). */
  dateOfBirth: z.iso.date().nullable(),
});
export const sessionUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  ...userProfileSchema.shape,
  defaultHouseholdId: z.uuid().nullable(),
  preferences: userPreferencesSchema,
  createdAt: wireDateTimeSchema,
  updatedAt: wireDateTimeSchema,
});
export const authHouseholdSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: householdRoleSchema,
  permissions: z.array(householdPermissionSchema),
  settings: householdSettingsSchema,
});
export const authSessionSchema = z.object({
  user: sessionUserSchema,
  household: authHouseholdSchema.nullable(),
});
export const authProvidersSchema = z.object({
  emailPassword: z.boolean(),
  socialProviders: z.object({ google: z.boolean(), github: z.boolean() }),
});

export type UserProfile = z.output<typeof userProfileSchema>;
export type UserPreferences = z.output<typeof userPreferencesSchema>;
export type SessionUser = z.output<typeof sessionUserSchema>;
export type AuthHousehold = z.output<typeof authHouseholdSchema>;
export type AuthSession = z.output<typeof authSessionSchema>;
export type AuthProviders = z.output<typeof authProvidersSchema>;
export type User = SessionUser;
export type UserPreferredTheme = z.output<typeof preferredThemeSchema>;
export type UserLanguage = z.output<typeof languageSchema>;
export type UserTimezone = string;
export type UserDateFormat = z.output<typeof dateFormatSchema>;
export type UserPreferredPeriod = z.output<typeof preferredPeriodSchema>;
