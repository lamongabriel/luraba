import { apiKeysTable } from "@luraba/db/schemas/api-keys.schema";
import { eq } from "drizzle-orm";
import request from "supertest";
import app from "@/app";
import { db } from "@/db";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { buildCategoryInput, createHousehold, createHouseholdMembership } from "@/test/factories";

type Context = Awaited<ReturnType<typeof createAuthenticatedContext>>;

async function createKey(
  context: Context,
  body: { name: string; expiresInDays?: number | null } = { name: "Agent" },
) {
  const response = await request(app)
    .post("/api/v1/api-keys")
    .set(createAuthHeaders(context.token))
    .send(body);
  expect(response.status).toBe(201);
  return response.body.data as { id: string; secret: string; prefix: string };
}

describe("api keys", () => {
  it("creates a key whose secret is shown once and never listed", async () => {
    const context = await createAuthenticatedContext();
    const created = await createKey(context, { name: "Claude Code", expiresInDays: 30 });

    expect(created.secret.startsWith("lur_")).toBe(true);
    expect(created.prefix.startsWith("lur_")).toBe(true);
    expect(created.secret.startsWith(created.prefix)).toBe(true);

    const list = await request(app).get("/api/v1/api-keys").set(createAuthHeaders(context.token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({
      id: created.id,
      name: "Claude Code",
      enabled: true,
      status: "active",
      lastUsedAt: null,
    });
    expect(list.body.data[0].expiresAt).not.toBeNull();
    expect(JSON.stringify(list.body)).not.toContain(created.secret);
    expect(list.body.data[0]).not.toHaveProperty("secret");
    expect(list.body.data[0]).not.toHaveProperty("key");

    const [row] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, created.id));
    expect(row?.key).not.toBe(created.secret);
  });

  it("validates the label and lists only the caller's keys", async () => {
    const owner = await createAuthenticatedContext();
    const other = await createAuthenticatedContext();
    await createKey(owner);

    const blank = await request(app)
      .post("/api/v1/api-keys")
      .set(createAuthHeaders(owner.token))
      .send({ name: "  " });
    expect(blank.status).toBe(422);

    const otherList = await request(app)
      .get("/api/v1/api-keys")
      .set(createAuthHeaders(other.token));
    expect(otherList.body.data).toEqual([]);
  });

  it("authenticates a household endpoint with a Bearer key and records usage", async () => {
    const context = await createAuthenticatedContext();
    const { secret, id } = await createKey(context);

    const bearer = await request(app)
      .get("/api/v1/categories")
      .set({ Authorization: `Bearer ${secret}`, "X-Household-Id": context.household.id });
    expect(bearer.status).toBe(200);

    const header = await request(app).get("/api/v1/categories").set({ "x-api-key": secret });
    expect(header.status).toBe(200);

    const me = await request(app).get("/api/v1/auth/me").set({ "x-api-key": secret });
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(context.user.id);

    const list = await request(app).get("/api/v1/api-keys").set(createAuthHeaders(context.token));
    expect(list.body.data.find((key: { id: string }) => key.id === id).lastUsedAt).not.toBeNull();
  });

  it("applies the owner's role: a viewer's key can read but not write", async () => {
    const viewer = await createAuthenticatedContext({ role: "viewer" });
    const { secret } = await createKey(viewer);
    const headers = { Authorization: `Bearer ${secret}`, "X-Household-Id": viewer.household.id };

    expect((await request(app).get("/api/v1/categories").set(headers)).status).toBe(200);
    const write = await request(app)
      .post("/api/v1/categories")
      .set(headers)
      .send(buildCategoryInput());
    expect(write.status).toBe(403);

    const owner = await createAuthenticatedContext();
    const ownerKey = await createKey(owner);
    const created = await request(app)
      .post("/api/v1/categories")
      .set({ Authorization: `Bearer ${ownerKey.secret}` })
      .send(buildCategoryInput());
    expect(created.status).toBe(201);
  });

  it("cannot reach a household the user is not a member of", async () => {
    const context = await createAuthenticatedContext();
    const stranger = await createAuthenticatedContext();
    const { secret } = await createKey(context);

    const response = await request(app)
      .get("/api/v1/categories")
      .set({ Authorization: `Bearer ${secret}`, "X-Household-Id": stranger.household.id });
    expect(response.status).toBe(403);
  });

  it("lets a key act in every household the user belongs to, picked with the header", async () => {
    const context = await createAuthenticatedContext();
    const second = await createHousehold(context.user.id);
    await createHouseholdMembership(second.id, context.user.id, "viewer");
    const { secret } = await createKey(context);

    const inSecond = await request(app)
      .post("/api/v1/categories")
      .set({ Authorization: `Bearer ${secret}`, "X-Household-Id": second.id })
      .send(buildCategoryInput());
    expect(inSecond.status).toBe(403);

    const inFirst = await request(app)
      .post("/api/v1/categories")
      .set({ Authorization: `Bearer ${secret}`, "X-Household-Id": context.household.id })
      .send(buildCategoryInput());
    expect(inFirst.status).toBe(201);
  });

  it("rejects unknown, revoked, expired and deleted keys with 401, and re-enabling restores access", async () => {
    const context = await createAuthenticatedContext();
    const { secret, id } = await createKey(context);
    const call = (key: string) =>
      request(app)
        .get("/api/v1/categories")
        .set({ Authorization: `Bearer ${key}` });

    expect(
      (await call("lur_does-not-exist-does-not-exist-does-not-exist-does-not-exist")).status,
    ).toBe(401);
    expect((await call(secret)).status).toBe(200);

    const revoke = await request(app)
      .patch(`/api/v1/api-keys/${id}`)
      .set(createAuthHeaders(context.token))
      .send({ enabled: false });
    expect(revoke.status).toBe(200);
    expect(revoke.body.data).toMatchObject({ enabled: false, status: "disabled" });
    expect((await call(secret)).status).toBe(401);

    const enable = await request(app)
      .patch(`/api/v1/api-keys/${id}`)
      .set(createAuthHeaders(context.token))
      .send({ enabled: true });
    expect(enable.body.data.status).toBe("active");
    expect((await call(secret)).status).toBe(200);

    await db
      .update(apiKeysTable)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(apiKeysTable.id, id));
    expect((await call(secret)).status).toBe(401);

    const second = await createKey(context, { name: "Second" });
    const del = await request(app)
      .delete(`/api/v1/api-keys/${second.id}`)
      .set(createAuthHeaders(context.token));
    expect(del.status).toBe(204);
    expect((await call(second.secret)).status).toBe(401);
  });

  it("renames a key and keeps another user's keys untouchable", async () => {
    const owner = await createAuthenticatedContext();
    const other = await createAuthenticatedContext();
    const { id } = await createKey(owner);

    const renamed = await request(app)
      .patch(`/api/v1/api-keys/${id}`)
      .set(createAuthHeaders(owner.token))
      .send({ name: "Renamed" });
    expect(renamed.body.data.name).toBe("Renamed");

    const empty = await request(app)
      .patch(`/api/v1/api-keys/${id}`)
      .set(createAuthHeaders(owner.token))
      .send({});
    expect(empty.status).toBe(422);

    const hijack = await request(app)
      .patch(`/api/v1/api-keys/${id}`)
      .set(createAuthHeaders(other.token))
      .send({ name: "Mine" });
    expect(hijack.status).toBe(404);
    const steal = await request(app)
      .delete(`/api/v1/api-keys/${id}`)
      .set(createAuthHeaders(other.token));
    expect(steal.status).toBe(404);
  });

  it("does not let an API key manage API keys", async () => {
    const context = await createAuthenticatedContext();
    const { secret } = await createKey(context);
    const headers = { Authorization: `Bearer ${secret}` };

    expect((await request(app).get("/api/v1/api-keys").set(headers)).status).toBe(403);
    expect(
      (await request(app).post("/api/v1/api-keys").set(headers).send({ name: "Escalate" })).status,
    ).toBe(403);
  });

  it("requires authentication for key management", async () => {
    expect((await request(app).get("/api/v1/api-keys")).status).toBe(401);
  });

  it("rate limits each key", async () => {
    const context = await createAuthenticatedContext();
    const { secret, id } = await createKey(context);
    await db
      .update(apiKeysTable)
      .set({ rateLimitMax: 2, rateLimitTimeWindow: 60_000 })
      .where(eq(apiKeysTable.id, id));
    const call = () => request(app).get("/api/v1/categories").set({ "x-api-key": secret });

    expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(200);
    const limited = await call();
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
  });
});
