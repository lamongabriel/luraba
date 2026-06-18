import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { usersTable } from '@/db/schemas/users.schema';
import { Repository } from '@/shared/repositories/repository';
import type { UpdateMyPreferencesRequestBody, UserPreferences, UserRecord } from './auth.types';

class AuthRepository extends Repository<UserRecord> {
  constructor() {
    super(usersTable, { orderBy: usersTable.name });
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    return this.get(id);
  }

  async getUserPreferences(id: string): Promise<UserPreferences | undefined> {
    const rows = await db
      .select({
        preferredLanguage: usersTable.preferredLanguage,
        preferredCurrency: usersTable.preferredCurrency,
        preferredTimezone: usersTable.preferredTimezone,
        preferredDateFormat: usersTable.preferredDateFormat,
        preferredPeriod: usersTable.preferredPeriod,
        preferredTheme: usersTable.preferredTheme,
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
      preferredPeriod: row.preferredPeriod,
      preferredTheme: row.preferredTheme,
    };
  }

  async updateUserPreferences(
    id: string,
    dto: UpdateMyPreferencesRequestBody,
  ): Promise<UserPreferences | undefined> {
    const row = await this.update(id, {
      preferredLanguage: dto.language,
      preferredCurrency: dto.currency,
      preferredTimezone: dto.timezone,
      preferredDateFormat: dto.dateFormat,
      preferredPeriod: dto.preferredPeriod,
      preferredTheme: dto.preferredTheme,
    });
    if (!row) return undefined;

    return {
      language: row.preferredLanguage,
      currency: row.preferredCurrency,
      timezone: row.preferredTimezone,
      dateFormat: row.preferredDateFormat,
      preferredPeriod: row.preferredPeriod,
      preferredTheme: row.preferredTheme,
    };
  }
}

export const authRepository = new AuthRepository();
