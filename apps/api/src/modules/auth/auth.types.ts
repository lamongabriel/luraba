import { householdPermissionSchema } from '@luraba/contracts';
import { z } from 'zod';
import type { usersTable } from '@/db/schemas/users.schema';
import { householdSettingsSchema } from '@/modules/households/households.types';
import { householdRoleSchema } from '@/shared/validation/households';
import {
  currencySchema,
  dateFormatSchema,
  languageSchema,
  preferredPeriodSchema,
  preferredThemeSchema,
  timezoneSchema,
} from '@/shared/validation/preferences';

export type UserRecord = typeof usersTable.$inferSelect;

export const userPreferencesSchema = z.object({
  language: languageSchema,
  currency: currencySchema,
  timezone: timezoneSchema,
  dateFormat: dateFormatSchema,
  preferredPeriod: preferredPeriodSchema,
  preferredTheme: preferredThemeSchema,
});

const userPreferencesPatchSchema = userPreferencesSchema.partial();

export const sessionUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  defaultHouseholdId: z.uuid().nullable(),
  preferences: userPreferencesSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
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
  socialProviders: z.object({
    google: z.boolean(),
    github: z.boolean(),
  }),
});

export const GetMeResponseSchema = authSessionSchema;
export const GetAuthProvidersResponseSchema = authProvidersSchema;

export const GetMyPreferencesResponseSchema = userPreferencesSchema;

export const UpdateMyPreferencesRequestBodySchema = userPreferencesPatchSchema;

export const UpdateMyPreferencesResponseSchema = userPreferencesSchema;

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type HouseholdSettings = z.infer<typeof householdSettingsSchema>;
export type AuthHousehold = z.infer<typeof authHouseholdSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthProviders = z.infer<typeof authProvidersSchema>;
export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;
export type GetAuthProvidersResponse = z.infer<typeof GetAuthProvidersResponseSchema>;
export type GetMyPreferencesResponse = z.infer<typeof GetMyPreferencesResponseSchema>;
export type UpdateMyPreferencesRequestBody = z.infer<typeof UpdateMyPreferencesRequestBodySchema>;
export type UpdateMyPreferencesResponse = z.infer<typeof UpdateMyPreferencesResponseSchema>;
