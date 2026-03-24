import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { usersTable } from '@/db/schemas/users.schema';
import {
  mapUserRowToUser,
  PublicUserRow,
  UpdatePreferencesDto,
  User,
  UserPreferences,
  UserRecord,
} from './users.types';

const userPublicSelect = {
  id: usersTable.id,
  name: usersTable.name,
  email: usersTable.email,
  preferredLanguage: usersTable.preferredLanguage,
  preferredCurrency: usersTable.preferredCurrency,
  preferredTimezone: usersTable.preferredTimezone,
  preferredDateFormat: usersTable.preferredDateFormat,
  defaultPeriod: usersTable.defaultPeriod,
  defaultAccountOrder: usersTable.defaultAccountOrder,
  countryCode: usersTable.countryCode,
  budgetMonthStartsOn: usersTable.budgetMonthStartsOn,
  themePreference: usersTable.themePreference,
  createdAt: usersTable.createdAt,
  updatedAt: usersTable.updatedAt,
};

export async function findAllUsers(): Promise<User[]> {
  const rows = await db.select(userPublicSelect).from(usersTable);
  return rows.map((row) => mapUserRowToUser(row as PublicUserRow));
}

export async function findUserById(id: number): Promise<User | undefined> {
  const rows = await db.select(userPublicSelect).from(usersTable).where(eq(usersTable.id, id));
  const row = rows[0] as PublicUserRow | undefined;
  return row ? mapUserRowToUser(row) : undefined;
}

export async function findUserRecordById(id: number): Promise<UserRecord | undefined> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id));
  return rows[0];
}

export async function findUserByEmail(email: string): Promise<UserRecord | undefined> {
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email));
  return rows[0];
}

export async function createUser(dto: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  const rows = await db.insert(usersTable).values(dto).returning(userPublicSelect);
  return mapUserRowToUser(rows[0] as PublicUserRow);
}

export async function updateUser(
  id: number,
  dto: {
    name?: string;
    email?: string;
    passwordHash?: string;
  },
): Promise<User | undefined> {
  const rows = await db
    .update(usersTable)
    .set({ ...dto, updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning(userPublicSelect);
  const row = rows[0] as PublicUserRow | undefined;
  return row ? mapUserRowToUser(row) : undefined;
}

export async function deleteUser(id: number): Promise<User | undefined> {
  const rows = await db.delete(usersTable).where(eq(usersTable.id, id)).returning(userPublicSelect);
  const row = rows[0] as PublicUserRow | undefined;
  return row ? mapUserRowToUser(row) : undefined;
}

export async function getUserPreferences(id: number): Promise<UserPreferences | undefined> {
  const rows = await db
    .select({
      preferredLanguage: usersTable.preferredLanguage,
      preferredCurrency: usersTable.preferredCurrency,
      preferredTimezone: usersTable.preferredTimezone,
      preferredDateFormat: usersTable.preferredDateFormat,
      defaultPeriod: usersTable.defaultPeriod,
      defaultAccountOrder: usersTable.defaultAccountOrder,
      countryCode: usersTable.countryCode,
      budgetMonthStartsOn: usersTable.budgetMonthStartsOn,
      themePreference: usersTable.themePreference,
    })
    .from(usersTable)
    .where(eq(usersTable.id, id));

  const row = rows[0];
  if (!row) return undefined;

  return {
    language: row.preferredLanguage,
    currency: row.preferredCurrency,
    timezone: row.preferredTimezone,
    dateFormat: row.preferredDateFormat,
    defaultPeriod: row.defaultPeriod,
    defaultAccountOrder: row.defaultAccountOrder,
    countryCode: row.countryCode,
    budgetMonthStartsOn: row.budgetMonthStartsOn,
    theme: row.themePreference,
  };
}

export async function updateUserPreferences(
  id: number,
  dto: UpdatePreferencesDto,
): Promise<UserPreferences | undefined> {
  const rows = await db
    .update(usersTable)
    .set({
      preferredLanguage: dto.language,
      preferredCurrency: dto.currency,
      preferredTimezone: dto.timezone,
      preferredDateFormat: dto.dateFormat,
      defaultPeriod: dto.defaultPeriod,
      defaultAccountOrder: dto.defaultAccountOrder,
      countryCode: dto.countryCode,
      budgetMonthStartsOn: dto.budgetMonthStartsOn,
      themePreference: dto.theme,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, id))
    .returning({
      preferredLanguage: usersTable.preferredLanguage,
      preferredCurrency: usersTable.preferredCurrency,
      preferredTimezone: usersTable.preferredTimezone,
      preferredDateFormat: usersTable.preferredDateFormat,
      defaultPeriod: usersTable.defaultPeriod,
      defaultAccountOrder: usersTable.defaultAccountOrder,
      countryCode: usersTable.countryCode,
      budgetMonthStartsOn: usersTable.budgetMonthStartsOn,
      themePreference: usersTable.themePreference,
    });

  const row = rows[0];
  if (!row) return undefined;

  return {
    language: row.preferredLanguage,
    currency: row.preferredCurrency,
    timezone: row.preferredTimezone,
    dateFormat: row.preferredDateFormat,
    defaultPeriod: row.defaultPeriod,
    defaultAccountOrder: row.defaultAccountOrder,
    countryCode: row.countryCode,
    budgetMonthStartsOn: row.budgetMonthStartsOn,
    theme: row.themePreference,
  };
}