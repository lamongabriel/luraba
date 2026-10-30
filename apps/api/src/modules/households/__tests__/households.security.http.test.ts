import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "@/app";
import {
  createAccessTokenForUser,
  createAuthenticatedContext,
  createAuthHeaders,
} from "@/test/auth";
import { createHouseholdMembership, createUser } from "@/test/factories";

/** Someone who is an owner of their own household, and a member of `householdId` with `role`. */
async function joinAs(householdId: string, role: "admin" | "member" | "viewer") {
  const own = await createAuthenticatedContext();
  const joined = await createHouseholdMembership(householdId, own.user.id, role);
  return { ...own, joined };
}

describe("household access boundaries", () => {
  it("never lets a role in one household act on another household", async () => {
    const victim = await createAuthenticatedContext();
    const attacker = await createAuthenticatedContext();
    const attackerHeaders = createAuthHeaders(attacker.token, attacker.household.id);
    const base = `/api/v1/households/${victim.household.id}`;

    const attempts = [
      request(app).get(base),
      request(app).patch(base).send({ name: "Stolen" }),
      request(app).delete(base),
      request(app).get(`${base}/members`),
      request(app).patch(`${base}/members/${victim.user.id}`).send({ role: "viewer" }),
      request(app).delete(`${base}/members/${victim.user.id}`),
      request(app).get(`${base}/invites`),
      request(app).post(`${base}/invites`).send({ email: "x@example.com", role: "viewer" }),
    ];
    for (const attempt of attempts) {
      const response = await attempt.set(attackerHeaders);
      expect(response.status).toBe(403);
    }
  });

  it("stops an admin of one household who owns another from demoting its owner", async () => {
    const owner = await createAuthenticatedContext();
    const intruder = await joinAs(owner.household.id, "admin");

    const response = await request(app)
      .patch(`/api/v1/households/${owner.household.id}/members/${owner.user.id}`)
      .set(createAuthHeaders(intruder.token, intruder.household.id))
      .send({ role: "viewer" });

    expect(response.status).toBe(403);
  });

  it("keeps admins from touching owners or other admins, and from granting admin", async () => {
    const owner = await createAuthenticatedContext();
    const admin = await joinAs(owner.household.id, "admin");
    const otherAdmin = await createUser();
    await createHouseholdMembership(owner.household.id, otherAdmin.id, "admin");
    const member = await createUser();
    await createHouseholdMembership(owner.household.id, member.id, "member");
    const headers = createAuthHeaders(admin.token, owner.household.id);
    const base = `/api/v1/households/${owner.household.id}`;

    const demoteOwner = await request(app)
      .patch(`${base}/members/${owner.user.id}`)
      .set(headers)
      .send({ role: "viewer" });
    const removeOwner = await request(app).delete(`${base}/members/${owner.user.id}`).set(headers);
    const demoteAdmin = await request(app)
      .patch(`${base}/members/${otherAdmin.id}`)
      .set(headers)
      .send({ role: "viewer" });
    const removeAdmin = await request(app).delete(`${base}/members/${otherAdmin.id}`).set(headers);
    const grantAdmin = await request(app)
      .patch(`${base}/members/${member.id}`)
      .set(headers)
      .send({ role: "admin" });
    const inviteAdmin = await request(app)
      .post(`${base}/invites`)
      .set(headers)
      .send({ email: "new-admin@example.com", role: "admin" });
    const changeSelf = await request(app)
      .patch(`${base}/members/${admin.user.id}`)
      .set(headers)
      .send({ role: "viewer" });

    for (const response of [
      demoteOwner,
      removeOwner,
      demoteAdmin,
      removeAdmin,
      grantAdmin,
      inviteAdmin,
      changeSelf,
    ]) {
      expect(response.status).toBe(403);
    }

    const allowed = await request(app)
      .patch(`${base}/members/${member.id}`)
      .set(headers)
      .send({ role: "viewer" });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.role).toBe("viewer");
  });

  it("lets owners grant admin, and lets the last-owner rule still apply", async () => {
    const owner = await createAuthenticatedContext();
    const member = await createUser();
    await createHouseholdMembership(owner.household.id, member.id, "member");
    const headers = createAuthHeaders(owner.token, owner.household.id);
    const base = `/api/v1/households/${owner.household.id}`;

    const promoted = await request(app)
      .patch(`${base}/members/${member.id}`)
      .set(headers)
      .send({ role: "admin" });
    expect(promoted.status).toBe(200);

    const demoteSelf = await request(app)
      .patch(`${base}/members/${owner.user.id}`)
      .set(headers)
      .send({ role: "admin" });
    expect(demoteSelf.status).toBe(422);
  });

  it("does not let members or viewers manage anyone", async () => {
    const owner = await createAuthenticatedContext();
    const member = await createUser();
    await createHouseholdMembership(owner.household.id, member.id, "member");
    const memberToken = await createAccessTokenForUser(member);
    const headers = createAuthHeaders(memberToken, owner.household.id);

    const response = await request(app)
      .patch(`/api/v1/households/${owner.household.id}/members/${owner.user.id}`)
      .set(headers)
      .send({ role: "viewer" });
    expect(response.status).toBe(403);
  });
});
