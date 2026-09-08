import { listIntegrationsQuerySchema } from "@luraba/contracts/integrations";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { brandfetchIntegrationsTable } from "@/db/schemas/brandfetch-integrations.schema";
import { createAuthenticatedContext } from "@/test/auth";
import * as integrationsService from "../integrations.service";

describe("integrations service", () => {
  it("lists household integrations without leaking credentials", async () => {
    const context = await createAuthenticatedContext();

    const listed = await integrationsService.listIntegrations(
      context.householdContext,
      listIntegrationsQuerySchema.parse({}),
    );
    expect(listed.data).toEqual([
      {
        provider: "brandfetch",
        configured: false,
        status: "not_configured",
        lastCheckedAt: null,
      },
    ]);
    expect((listed.data[0] as Record<string, unknown>).clientId).toBeUndefined();
  });

  it("combines search and every integration column filter in SQL", async () => {
    const context = await createAuthenticatedContext();
    await db.insert(brandfetchIntegrationsTable).values({
      householdId: context.household.id,
      encryptedClientId: "not-read-by-list",
      lastCheckedAt: new Date("2025-06-15T12:00:00.000Z"),
    });

    const result = await integrationsService.listIntegrations(
      context.householdContext,
      listIntegrationsQuerySchema.parse({
        search: "connected",
        providers: "brandfetch",
        statuses: "connected",
        configured: true,
        lastCheckedAtFrom: "2025-06-15T12:00:00.000Z",
        lastCheckedAtTo: "2025-06-15T12:00:00.000Z",
        sort: "lastCheckedAt",
        perPage: 1,
      }),
    );

    expect(result.data).toEqual([
      expect.objectContaining({
        provider: "brandfetch",
        configured: true,
        status: "connected",
      }),
    ]);
    expect(result.meta.pagination.totalCount).toBe(1);
  });
});
