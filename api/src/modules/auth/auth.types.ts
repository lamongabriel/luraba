import { z } from 'zod';
import { HOUSEHOLD_PERMISSIONS } from '@/config/permissions';
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

export const RegisterRequestPreferencesSchema = userPreferencesSchema.partial().default({});

export const RegisterRequestHouseholdSettingsSchema = householdSettingsSchema.partial().default({});

export const RegisterRequestHouseholdSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(4000).optional(),
    settings: RegisterRequestHouseholdSettingsSchema,
  })
  .default({
    settings: {},
  });

export const RegisterRequestBodySchema = z.object({
  name: z.string().min(1).max(255),
  email: z.email().max(255),
  password: z.string().min(8).max(128),
  preferences: RegisterRequestPreferencesSchema,
  household: RegisterRequestHouseholdSchema,
});

export const LoginRequestBodySchema = z.object({
  email: z.email().max(255),
  password: z.string().min(1).max(128),
});

export const householdPermissionSchema = z.enum(HOUSEHOLD_PERMISSIONS);

export const authHouseholdSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: householdRoleSchema,
  permissions: z.array(householdPermissionSchema),
  settings: householdSettingsSchema,
});

export const authSessionSchema = z.object({
  user: sessionUserSchema,
  household: authHouseholdSchema,
});

export const RegisterResponseSchema = authSessionSchema.extend({
  accessToken: z.string().min(1),
});

export const LoginResponseSchema = RegisterResponseSchema;

export const LogoutResponseSchema = z.object({
  ok: z.literal(true),
});

export const GetMeResponseSchema = authSessionSchema;

export const GetMyPreferencesResponseSchema = userPreferencesSchema;

export const UpdateMyPreferencesRequestBodySchema = userPreferencesPatchSchema;

export const UpdateMyPreferencesResponseSchema = userPreferencesSchema;

export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type SessionUser = z.infer<typeof sessionUserSchema>;
export type HouseholdSettings = z.infer<typeof householdSettingsSchema>;
export type RegisterRequestBody = z.infer<typeof RegisterRequestBodySchema>;
export type LoginRequestBody = z.infer<typeof LoginRequestBodySchema>;
export type AuthHousehold = z.infer<typeof authHouseholdSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type LogoutResponse = z.infer<typeof LogoutResponseSchema>;
export type GetMeResponse = z.infer<typeof GetMeResponseSchema>;
export type GetMyPreferencesResponse = z.infer<typeof GetMyPreferencesResponseSchema>;
export type UpdateMyPreferencesRequestBody = z.infer<typeof UpdateMyPreferencesRequestBodySchema>;
export type UpdateMyPreferencesResponse = z.infer<typeof UpdateMyPreferencesResponseSchema>;
