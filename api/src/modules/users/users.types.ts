import { z } from 'zod';
import { usersTable } from '@/db/schemas/users.schema';

// Drizzle-inferred types
export type UserRecord = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export const languageSchema = z.enum(['en', 'pt-BR']);
export const currencySchema = z.enum(['BRL', 'USD', 'EUR']);
export const timezoneSchema = z.enum(['America/Sao_Paulo', 'UTC']);
export const dateFormatSchema = z.enum(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']);
export const defaultPeriodSchema = z.enum([
  'last_day',
  'current_week',
  'last_7_days',
  'current_month',
  'last_month',
  'last_30_days',
  'last_90_days',
  'current_year',
  'last_365_days',
  'last_5_years',
  'last_10_years',
  'all_time',
]);
export const defaultAccountOrderSchema = z.enum(['name_asc', 'name_desc', 'newest', 'oldest']);
export const countryCodeSchema = z.enum(['BR', 'US']);
export const themePreferenceSchema = z.enum(['light', 'dark', 'system']);

export const userPreferencesSchema = z.object({
  language: languageSchema,
  currency: currencySchema,
  timezone: timezoneSchema,
  dateFormat: dateFormatSchema,
  defaultPeriod: defaultPeriodSchema,
  defaultAccountOrder: defaultAccountOrderSchema,
  countryCode: countryCodeSchema,
  budgetMonthStartsOn: z.number().int().min(1).max(28),
  theme: themePreferenceSchema,
});

export const updatePreferencesSchema = userPreferencesSchema.partial();

export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export type PublicUserRow = {
  id: number;
  name: string;
  email: string;
  preferredLanguage: UserPreferences['language'];
  preferredCurrency: UserPreferences['currency'];
  preferredTimezone: UserPreferences['timezone'];
  preferredDateFormat: UserPreferences['dateFormat'];
  defaultPeriod: UserPreferences['defaultPeriod'];
  defaultAccountOrder: UserPreferences['defaultAccountOrder'];
  countryCode: UserPreferences['countryCode'];
  budgetMonthStartsOn: UserPreferences['budgetMonthStartsOn'];
  themePreference: UserPreferences['theme'];
  createdAt: Date;
  updatedAt: Date;
};

export type User = {
  id: number;
  name: string;
  email: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
};

export function mapUserRowToUser(row: PublicUserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    preferences: {
      language: row.preferredLanguage,
      currency: row.preferredCurrency,
      timezone: row.preferredTimezone,
      dateFormat: row.preferredDateFormat,
      defaultPeriod: row.defaultPeriod,
      defaultAccountOrder: row.defaultAccountOrder,
      countryCode: row.countryCode,
      budgetMonthStartsOn: row.budgetMonthStartsOn,
      theme: row.themePreference,
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Zod schemas for request validation
export const createUserSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  password: z.string().min(8).max(128).optional(),
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Inferred request types
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type UpdatePreferencesDto = z.infer<typeof updatePreferencesSchema>;