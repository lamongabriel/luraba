import { apiKeysTable } from "@luraba/db/schemas/api-keys.schema";
import { usersTable } from "@luraba/db/schemas/users.schema";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";

export type ApiKeyRecord = typeof apiKeysTable.$inferSelect;

/**
 * API keys belong to a user, not to a household, so this is not a `HouseholdScopedRepository`.
 * Every read and write is filtered by the owner (`referenceId`); the secret column is never selected.
 */
const publicColumns = {
  id: apiKeysTable.id,
  name: apiKeysTable.name,
  start: apiKeysTable.start,
  enabled: apiKeysTable.enabled,
  expiresAt: apiKeysTable.expiresAt,
  lastRequest: apiKeysTable.lastRequest,
  createdAt: apiKeysTable.createdAt,
};

export type PublicApiKeyRecord = Pick<
  ApiKeyRecord,
  "id" | "name" | "start" | "enabled" | "expiresAt" | "lastRequest" | "createdAt"
>;

class ApiKeysRepository {
  async listForUser(userId: string): Promise<PublicApiKeyRecord[]> {
    return db
      .select(publicColumns)
      .from(apiKeysTable)
      .where(eq(apiKeysTable.referenceId, userId))
      .orderBy(desc(apiKeysTable.createdAt));
  }

  async findForUser(userId: string, id: string): Promise<PublicApiKeyRecord | undefined> {
    const rows = await db
      .select(publicColumns)
      .from(apiKeysTable)
      .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.referenceId, userId)));
    return rows[0];
  }

  async update(
    userId: string,
    id: string,
    values: { name?: string; enabled?: boolean },
  ): Promise<PublicApiKeyRecord | undefined> {
    const rows = await db
      .update(apiKeysTable)
      .set(values)
      .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.referenceId, userId)))
      .returning(publicColumns);
    return rows[0];
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const rows = await db
      .delete(apiKeysTable)
      .where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.referenceId, userId)))
      .returning({ id: apiKeysTable.id });
    return rows.length > 0;
  }

  async findUserEmail(userId: string): Promise<string | undefined> {
    const rows = await db
      .select({ email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    return rows[0]?.email;
  }
}

export const apiKeysRepository = new ApiKeysRepository();
