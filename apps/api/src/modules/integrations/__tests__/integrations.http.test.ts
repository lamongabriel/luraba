import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";

describe("integrations routes", () => {
  it("GET /api/v1/integrations returns the active household integrations", async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get("/api/v1/integrations")
      .set(createAuthHeaders(context.token, context.household.id))
      .query({
        page: 1,
        perPage: 1,
        search: "brandfetch",
        sort: "provider",
        providers: "brandfetch",
        statuses: "not_configured",
        configured: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([
      {
        provider: "brandfetch",
        configured: false,
        status: "not_configured",
        lastCheckedAt: null,
      },
    ]);
    expect(response.body.meta.pagination).toEqual({
      page: 1,
      perPage: 1,
      totalCount: 1,
      totalPages: 1,
    });
  });

  it("rejects list, update, and delete with an inaccessible household header", async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();
    const headers = createAuthHeaders(outsider.token, owner.household.id);

    const [list, update, remove] = await Promise.all([
      request(app).get("/api/v1/integrations").set(headers),
      request(app)
        .put("/api/v1/integrations/brandfetch")
        .set(headers)
        .send({ clientId: "not-validated" }),
      request(app).delete("/api/v1/integrations/brandfetch").set(headers),
    ]);

    expect(list.status).toBe(403);
    expect(update.status).toBe(403);
    expect(remove.status).toBe(403);
  });
});
