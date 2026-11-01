import request from "supertest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";

describe("GET /api/v1/transactions/:id", () => {
  it("requires authentication and answers 404 for an unknown transaction", async () => {
    const id = "6f1c2f3e-3b7d-4b1e-9a2d-1c9a8f0e1d11";
    expect((await request(app).get(`/api/v1/transactions/${id}`)).status).toBe(401);

    const context = await createAuthenticatedContext();
    const response = await request(app)
      .get(`/api/v1/transactions/${id}`)
      .set(createAuthHeaders(context.token, context.household.id));
    expect(response.status).toBe(404);
  });
});
