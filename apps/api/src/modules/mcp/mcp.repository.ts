import { oauthAccessTokenTable, oauthApplicationTable, oauthConsentTable } from "@luraba/db/schema";
import { and, eq, max, min } from "drizzle-orm";
import { db } from "@/db";

/**
 * OAuth clients, tokens and consents of the Better Auth `mcp` plugin. Every query is scoped to the
 * signed-in user (`user_id`): these tables have no household column, tokens belong to a person.
 */
class McpRepository {
  async listConnections(userId: string) {
    return db
      .select({
        clientId: oauthApplicationTable.clientId,
        name: oauthApplicationTable.name,
        grantedAt: min(oauthAccessTokenTable.createdAt),
        lastUsedAt: max(oauthAccessTokenTable.updatedAt),
      })
      .from(oauthAccessTokenTable)
      .innerJoin(
        oauthApplicationTable,
        eq(oauthApplicationTable.clientId, oauthAccessTokenTable.clientId),
      )
      .where(eq(oauthAccessTokenTable.userId, userId))
      .groupBy(oauthApplicationTable.clientId, oauthApplicationTable.name);
  }

  async revoke(userId: string, clientId: string): Promise<number> {
    const tokens = await db
      .delete(oauthAccessTokenTable)
      .where(
        and(eq(oauthAccessTokenTable.userId, userId), eq(oauthAccessTokenTable.clientId, clientId)),
      )
      .returning({ id: oauthAccessTokenTable.id });
    await db
      .delete(oauthConsentTable)
      .where(and(eq(oauthConsentTable.userId, userId), eq(oauthConsentTable.clientId, clientId)));
    return tokens.length;
  }

  async findClient(clientId: string) {
    const rows = await db
      .select({
        clientId: oauthApplicationTable.clientId,
        name: oauthApplicationTable.name,
        redirectUrls: oauthApplicationTable.redirectUrls,
        disabled: oauthApplicationTable.disabled,
      })
      .from(oauthApplicationTable)
      .where(eq(oauthApplicationTable.clientId, clientId));
    return rows[0];
  }

  /** Marks a token as used (its `updated_at` is the "last used" shown to the user). */
  async touchToken(accessToken: string): Promise<void> {
    await db
      .update(oauthAccessTokenTable)
      .set({ updatedAt: new Date() })
      .where(eq(oauthAccessTokenTable.accessToken, accessToken));
  }
}

export const mcpRepository = new McpRepository();
