import type { UpdateUserPreferencesInput, UserPreferences } from "@luraba/contracts/auth";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usersTable } from "@/db/schemas/users.schema";
import { now } from "@/shared/lib/date";
import { Repository } from "@/shared/repositories/repository";
import type { UserRecord } from "./auth.types";

class AuthRepository extends Repository<UserRecord> {
  constructor() {
    super(usersTable, { orderBy: usersTable.name });
  }

  async findById(id: string): Promise<UserRecord | undefined> {
    return this.get(id);
  }

  async touchLastActive(id: string): Promise<void> {
    await db.update(usersTable).set({ lastActiveAt: now() }).where(eq(usersTable.id, id));
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
    dto: UpdateUserPreferencesInput,
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
