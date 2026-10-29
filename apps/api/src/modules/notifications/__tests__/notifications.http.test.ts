import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import { createAuthenticatedContext, createAuthHeaders } from "@/test/auth";
import { notify } from "../notifications.emitter";

describe("notifications routes", () => {
  it("requires authentication", async () => {
    const response = await request(app).get("/api/v1/notifications");

    expect(response.status).toBe(401);
  });

  it("lists in-app notifications with an unread summary, scoped to the user", async () => {
    const owner = await createAuthenticatedContext();
    const other = await createAuthenticatedContext();

    await notify({
      userIds: [owner.user.id],
      eventType: "transaction.created",
      title: "Pedro added an expense",
      body: "Water bill · $80.00",
      url: "/transactions",
    });
    await notify({
      userIds: [other.user.id],
      eventType: "transaction.created",
      title: "Someone else's alert",
      body: "Not yours",
    });

    const response = await request(app)
      .get("/api/v1/notifications")
      .set(createAuthHeaders(owner.token));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      title: "Pedro added an expense",
      url: "/transactions",
      readAt: null,
    });
    expect(response.body.meta.summary).toEqual({ count: 1 });
  });

  it("is idempotent for a repeated dedupe key", async () => {
    const { user, token } = await createAuthenticatedContext();
    const input = {
      userIds: [user.id],
      eventType: "transaction.created" as const,
      title: "Reminder",
      body: "Once only",
      dedupeKey: "reminder:1",
    };

    expect(await notify(input)).toBe(1);
    expect(await notify(input)).toBe(0);

    const response = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set(createAuthHeaders(token));
    expect(response.body.data).toEqual({ count: 1 });
  });

  it("marks one notification and then all notifications as read", async () => {
    const { user, token } = await createAuthenticatedContext();
    await notify({ userIds: [user.id], eventType: "transaction.created", title: "A", body: "a" });
    await notify({ userIds: [user.id], eventType: "transaction.created", title: "B", body: "b" });

    const list = await request(app).get("/api/v1/notifications").set(createAuthHeaders(token));
    const [first] = list.body.data;

    const markOne = await request(app)
      .post(`/api/v1/notifications/${first.id}/read`)
      .set(createAuthHeaders(token));
    expect(markOne.status).toBe(204);

    const afterOne = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set(createAuthHeaders(token));
    expect(afterOne.body.data).toEqual({ count: 1 });

    await request(app).post("/api/v1/notifications/read-all").set(createAuthHeaders(token));
    const afterAll = await request(app)
      .get("/api/v1/notifications/unread-count")
      .set(createAuthHeaders(token));
    expect(afterAll.body.data).toEqual({ count: 0 });
  });

  it("does not let a user read or delete another user's notification", async () => {
    const owner = await createAuthenticatedContext();
    const intruder = await createAuthenticatedContext();
    await notify({
      userIds: [owner.user.id],
      eventType: "transaction.created",
      title: "A",
      body: "a",
    });
    const list = await request(app)
      .get("/api/v1/notifications")
      .set(createAuthHeaders(owner.token));
    const id = list.body.data[0].id;

    const read = await request(app)
      .post(`/api/v1/notifications/${id}/read`)
      .set(createAuthHeaders(intruder.token));
    const remove = await request(app)
      .delete(`/api/v1/notifications/${id}`)
      .set(createAuthHeaders(intruder.token));

    expect(read.status).toBe(404);
    expect(remove.status).toBe(404);
  });

  it("returns the preference matrix with defaults and saves overrides", async () => {
    const { token } = await createAuthenticatedContext();

    const initial = await request(app)
      .get("/api/v1/notifications/preferences")
      .set(createAuthHeaders(token));
    const created = initial.body.data.find(
      (row: { eventType: string }) => row.eventType === "transaction.created",
    );
    expect(created.channels).toEqual({ in_app: true, email: false, push: false, sms: false });

    const updated = await request(app)
      .patch("/api/v1/notifications/preferences")
      .set(createAuthHeaders(token))
      .send({
        preferences: [{ eventType: "transaction.created", channel: "email", enabled: true }],
      });

    expect(updated.status).toBe(200);
    const saved = updated.body.data.find(
      (row: { eventType: string }) => row.eventType === "transaction.created",
    );
    expect(saved.channels.email).toBe(true);
  });

  it("skips the inbox when in-app is switched off for an event", async () => {
    const { user, token } = await createAuthenticatedContext();
    await request(app)
      .patch("/api/v1/notifications/preferences")
      .set(createAuthHeaders(token))
      .send({
        preferences: [{ eventType: "transaction.created", channel: "in_app", enabled: false }],
      });

    const notified = await notify({
      userIds: [user.id],
      eventType: "transaction.created",
      title: "Muted",
      body: "Should not appear",
    });

    expect(notified).toBe(0);
  });

  it("validates and stores the phone number, and reports channel state", async () => {
    const { token } = await createAuthenticatedContext();

    const invalid = await request(app)
      .patch("/api/v1/notifications/contact")
      .set(createAuthHeaders(token))
      .send({ phoneNumber: "11999999999" });
    expect(invalid.status).toBe(422);

    const valid = await request(app)
      .patch("/api/v1/notifications/contact")
      .set(createAuthHeaders(token))
      .send({ phoneNumber: "+5511999999999" });
    expect(valid.status).toBe(200);
    expect(valid.body.data.phoneNumber).toBe("+5511999999999");
    expect(valid.body.data.channels.sms).toEqual({ available: false, ready: true });
  });

  it("refuses to test a channel that is not configured on the server", async () => {
    const { token } = await createAuthenticatedContext();

    const response = await request(app)
      .post("/api/v1/notifications/test")
      .set(createAuthHeaders(token))
      .send({ channel: "sms" });

    expect(response.status).toBe(503);
  });

  it("sends an in-app test notification", async () => {
    const { token } = await createAuthenticatedContext();

    const sent = await request(app)
      .post("/api/v1/notifications/test")
      .set(createAuthHeaders(token))
      .send({ channel: "in_app" });
    const list = await request(app).get("/api/v1/notifications").set(createAuthHeaders(token));

    expect(sent.status).toBe(204);
    expect(list.body.data[0].eventType).toBe("system.test");
  });
});
