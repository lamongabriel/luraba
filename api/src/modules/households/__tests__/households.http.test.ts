import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '@/app';
import { db } from '@/db';
import { householdInvitesTable } from '@/db/schemas/households.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { mailService } from '@/modules/mail/mail.service';
import {
  createAccessTokenForUser,
  createAuthenticatedContext,
  createAuthHeaders,
} from '@/test/auth';
import { createHouseholdMembership, createUser } from '@/test/factories';

function tokenFromUrl(url: string): string {
  const token = new URL(url).pathname.split('/').at(-1);
  if (!token) throw new Error('Invitation URL does not contain a token');
  return token;
}

async function createInvite(
  owner: Awaited<ReturnType<typeof createAuthenticatedContext>>,
  email: string,
  role: 'admin' | 'member' | 'viewer' = 'member',
) {
  return request(app)
    .post(`/api/v1/households/${owner.household.id}/invites`)
    .set(createAuthHeaders(owner.token, owner.household.id))
    .send({ email, role });
}

async function createInviteLink(
  owner: Awaited<ReturnType<typeof createAuthenticatedContext>>,
  inviteId: string,
) {
  const response = await request(app)
    .post(`/api/v1/households/${owner.household.id}/invites/${inviteId}/link`)
    .set(createAuthHeaders(owner.token, owner.household.id));

  expect(response.status).toBe(200);
  return {
    expiresAt: response.body.data.expiresAt as string,
    token: tokenFromUrl(response.body.data.url),
    url: response.body.data.url as string,
  };
}

describe('households routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists and creates only Luraba-owned households', async () => {
    const context = await createAuthenticatedContext();
    const list = await request(app)
      .get('/api/v1/households')
      .set(createAuthHeaders(context.token, context.household.id))
      .query({ page: 1, perPage: 1, search: context.household.name, roles: 'owner' });

    expect(list.status).toBe(200);
    expect(list.body.data).toEqual([
      expect.objectContaining({ id: context.household.id, role: 'owner' }),
    ]);
    expect(list.body.meta.pagination).toMatchObject({ page: 1, perPage: 1, totalCount: 1 });

    const created = await request(app)
      .post('/api/v1/households')
      .set(createAuthHeaders(context.token))
      .send({ name: 'Shared Finances', defaultCurrencyId: 'USD', timezone: 'UTC' });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      name: 'Shared Finances',
      defaultCurrencyId: 'USD',
      role: 'owner',
      createdByUserId: context.user.id,
    });
  });

  it('uses the header-selected household and rejects inaccessible household headers', async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();

    const allowed = await request(app)
      .get(`/api/v1/households/${owner.household.id}/members`)
      .set(createAuthHeaders(owner.token, owner.household.id));
    const denied = await request(app)
      .get(`/api/v1/households/${owner.household.id}/members`)
      .set(createAuthHeaders(outsider.token, owner.household.id));

    expect(allowed.status).toBe(200);
    expect(denied.status).toBe(403);
  });

  it('loads a route household without changing the selected household context', async () => {
    const owner = await createAuthenticatedContext();
    const target = await createAuthenticatedContext();
    await createHouseholdMembership(target.household.id, owner.user.id, 'member');

    const response = await request(app)
      .get(`/api/v1/households/${target.household.id}`)
      .set(createAuthHeaders(owner.token, owner.household.id));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: target.household.id, role: 'member' });
  });

  it('allows only owners to permanently delete a household and isolates the route', async () => {
    const owner = await createAuthenticatedContext();
    const member = await createUser({ email: 'delete-member@example.com' });
    await createHouseholdMembership(owner.household.id, member.id, 'member');
    const memberToken = await createAccessTokenForUser(member);
    const outsider = await createAuthenticatedContext();

    await request(app)
      .delete(`/api/v1/households/${owner.household.id}`)
      .set(createAuthHeaders(memberToken, owner.household.id))
      .expect(403);

    await request(app)
      .delete(`/api/v1/households/${owner.household.id}`)
      .set(createAuthHeaders(outsider.token, owner.household.id))
      .expect(403);

    await request(app)
      .delete(`/api/v1/households/${owner.household.id}`)
      .set(createAuthHeaders(owner.token, owner.household.id))
      .expect(204);

    const deleted = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, member.id));
    expect(deleted).toHaveLength(1);

    await request(app)
      .get(`/api/v1/households/${owner.household.id}`)
      .set(createAuthHeaders(owner.token))
      .expect(403);
  });

  it('lists rich member fields and filters global activity in SQL', async () => {
    const context = await createAuthenticatedContext();
    const activeAt = new Date('2026-05-10T12:00:00.000Z');
    await db
      .update(usersTable)
      .set({ emailVerified: true, lastActiveAt: activeAt })
      .where(eq(usersTable.id, context.user.id));

    const response = await request(app)
      .get(`/api/v1/households/${context.household.id}/members`)
      .set(createAuthHeaders(context.token, context.household.id))
      .query({
        emailVerified: true,
        lastActiveAtFrom: '2026-05-10T00:00:00.000Z',
        lastActiveAtTo: '2026-05-10T23:59:59.999Z',
        sort: 'lastActiveAt',
        sortDirection: 'desc',
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([
      expect.objectContaining({
        id: context.membership.id,
        email: context.user.email,
        emailVerified: true,
        image: null,
        lastActiveAt: activeAt.toISOString(),
      }),
    ]);
  });

  it('creates hashed-token invitations without exposing raw tokens', async () => {
    const owner = await createAuthenticatedContext();
    const created = await createInvite(owner, 'token-storage@example.com');
    expect(created.status).toBe(201);

    const link = await createInviteLink(owner, created.body.data.id);
    const [stored] = await db
      .select()
      .from(householdInvitesTable)
      .where(eq(householdInvitesTable.id, created.body.data.id));

    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(link.token);
    expect(JSON.stringify(created.body)).not.toContain(link.token);

    const listed = await request(app)
      .get(`/api/v1/households/${owner.household.id}/invites`)
      .set(createAuthHeaders(owner.token, owner.household.id));
    expect(JSON.stringify(listed.body)).not.toContain(link.token);
    expect(JSON.stringify(listed.body)).not.toContain(stored.tokenHash);
  });

  it('rotates invitation links and invalidates the previous token', async () => {
    const owner = await createAuthenticatedContext();
    const created = await createInvite(owner, 'rotate@example.com');
    const first = await createInviteLink(owner, created.body.data.id);
    const second = await createInviteLink(owner, created.body.data.id);

    expect(second.token).not.toBe(first.token);
    await request(app)
      .get('/api/v1/households/invites/preview')
      .query({ token: first.token })
      .expect(404);
    await request(app)
      .get('/api/v1/households/invites/preview')
      .query({ token: second.token })
      .expect(200);
  });

  it('returns 404 for a malformed invitation token', async () => {
    await request(app)
      .get('/api/v1/households/invites/preview')
      .query({ token: 'not-a-valid-token' })
      .expect(404);
  });

  it('previews and accepts a matching token, then selects the invited household by default', async () => {
    const owner = await createAuthenticatedContext();
    const invitedUser = await createUser({ email: 'accept-token@example.com' });
    const invitedSession = await createAccessTokenForUser(invitedUser);
    const created = await createInvite(owner, invitedUser.email, 'viewer');
    const link = await createInviteLink(owner, created.body.data.id);

    const preview = await request(app)
      .get('/api/v1/households/invites/preview')
      .query({ token: link.token });
    expect(preview.status).toBe(200);
    expect(preview.body.data).toEqual({
      email: invitedUser.email,
      household: { name: owner.household.name },
      role: 'viewer',
      inviter: { name: owner.user.name, image: null },
      status: 'pending',
      expiresAt: expect.any(String),
    });

    const accepted = await request(app)
      .post('/api/v1/households/invites/accept')
      .set(createAuthHeaders(invitedSession))
      .send({ token: link.token });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.household).toMatchObject({
      id: owner.household.id,
      role: 'viewer',
    });

    const [invite, user] = await Promise.all([
      db
        .select()
        .from(householdInvitesTable)
        .where(eq(householdInvitesTable.id, created.body.data.id))
        .then((rows) => rows[0]),
      db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, invitedUser.id))
        .then((rows) => rows[0]),
    ]);
    expect(invite.status).toBe('accepted');
    expect(invite.acceptedAt).toBeInstanceOf(Date);
    expect(user).toMatchObject({ defaultHouseholdId: owner.household.id, emailVerified: true });

    await request(app)
      .post('/api/v1/households/invites/accept')
      .set(createAuthHeaders(invitedSession))
      .send({ token: link.token })
      .expect(409);
  });

  it('rejects mismatched and expired token acceptance', async () => {
    const owner = await createAuthenticatedContext();
    const invitedUser = await createUser({ email: 'expiry@example.com' });
    const invitedSession = await createAccessTokenForUser(invitedUser);
    const created = await createInvite(owner, invitedUser.email);
    const link = await createInviteLink(owner, created.body.data.id);
    const outsider = await createAuthenticatedContext();

    await request(app)
      .post('/api/v1/households/invites/accept')
      .set(createAuthHeaders(outsider.token))
      .send({ token: link.token })
      .expect(403);

    await db
      .update(householdInvitesTable)
      .set({ expiresAt: new Date('2020-01-01T00:00:00.000Z') })
      .where(eq(householdInvitesTable.id, created.body.data.id));

    const preview = await request(app)
      .get('/api/v1/households/invites/preview')
      .query({ token: link.token });
    expect(preview.body.data.status).toBe('expired');

    await request(app)
      .post('/api/v1/households/invites/accept')
      .set(createAuthHeaders(invitedSession))
      .send({ token: link.token })
      .expect(409);
  });

  it.each(['rejected', 'canceled'] as const)(
    'preserves the %s state for public preview',
    async (status) => {
      const owner = await createAuthenticatedContext();
      const invitedUser = await createUser({ email: `${status}@example.com` });
      const invitedSession = await createAccessTokenForUser(invitedUser);
      const created = await createInvite(owner, invitedUser.email);
      const link = await createInviteLink(owner, created.body.data.id);

      if (status === 'rejected') {
        await request(app)
          .post('/api/v1/households/invites/reject')
          .set(createAuthHeaders(invitedSession))
          .send({ token: link.token })
          .expect(204);
      } else {
        await request(app)
          .delete(`/api/v1/households/${owner.household.id}/invites/${created.body.data.id}`)
          .set(createAuthHeaders(owner.token, owner.household.id))
          .expect(204);
      }

      const preview = await request(app)
        .get('/api/v1/households/invites/preview')
        .query({ token: link.token });
      expect(preview.status).toBe(200);
      expect(preview.body.data.status).toBe(status);
    },
  );

  it('returns conflicts for active duplicate invitations and existing members', async () => {
    const owner = await createAuthenticatedContext();
    const invitedUser = await createUser({ email: 'duplicate@example.com' });

    await createInvite(owner, invitedUser.email).then((response) =>
      expect(response.status).toBe(201),
    );
    await createInvite(owner, invitedUser.email).then((response) =>
      expect(response.status).toBe(409),
    );
    await createHouseholdMembership(owner.household.id, invitedUser.id, 'member');
    await createInvite(owner, invitedUser.email).then((response) =>
      expect(response.status).toBe(409),
    );
  });

  it('updates and removes members directly while protecting the last owner', async () => {
    const owner = await createAuthenticatedContext();
    const member = await createUser({ email: 'managed@example.com' });
    const membership = await createHouseholdMembership(owner.household.id, member.id, 'member');
    const headers = createAuthHeaders(owner.token, owner.household.id);

    const updated = await request(app)
      .patch(`/api/v1/households/${owner.household.id}/members/${member.id}`)
      .set(headers)
      .send({ role: 'viewer' });
    expect(updated.body.data).toMatchObject({ id: membership.id, role: 'viewer' });

    await request(app)
      .delete(`/api/v1/households/${owner.household.id}/members/${member.id}`)
      .set(headers)
      .expect(204);
    await request(app)
      .delete(`/api/v1/households/${owner.household.id}/members/${owner.user.id}`)
      .set(headers)
      .expect(422);
  });

  it('allows admins to invite while members and viewers remain read-only', async () => {
    const owner = await createAuthenticatedContext();
    const admin = await createUser({ email: 'admin@example.com' });
    const member = await createUser({ email: 'member@example.com' });
    const viewer = await createUser({ email: 'viewer@example.com' });
    await createHouseholdMembership(owner.household.id, admin.id, 'admin');
    await createHouseholdMembership(owner.household.id, member.id, 'member');
    await createHouseholdMembership(owner.household.id, viewer.id, 'viewer');
    const [adminToken, memberToken, viewerToken] = await Promise.all([
      createAccessTokenForUser(admin),
      createAccessTokenForUser(member),
      createAccessTokenForUser(viewer),
    ]);

    const inviteAs = (token: string, email: string) =>
      request(app)
        .post(`/api/v1/households/${owner.household.id}/invites`)
        .set(createAuthHeaders(token, owner.household.id))
        .send({ email, role: 'member' });

    expect((await inviteAs(adminToken, 'admin-created@example.com')).status).toBe(201);
    expect((await inviteAs(memberToken, 'member-created@example.com')).status).toBe(403);
    expect((await inviteAs(viewerToken, 'viewer-created@example.com')).status).toBe(403);
  });

  it('keeps invitations when SMTP is unavailable or delivery fails', async () => {
    const owner = await createAuthenticatedContext();
    const configured = vi.spyOn(mailService, 'isConfigured');
    const send = vi.spyOn(mailService, 'send');

    configured.mockReturnValue(false);
    const withoutSmtp = await createInvite(owner, 'no-smtp@example.com');
    expect(withoutSmtp.status).toBe(201);
    expect(send).not.toHaveBeenCalled();

    configured.mockReturnValue(true);
    send.mockRejectedValue(new Error('SMTP unavailable'));
    const failedDelivery = await createInvite(owner, 'smtp-failure@example.com');
    expect(failedDelivery.status).toBe(201);

    const rows = await db
      .select()
      .from(householdInvitesTable)
      .where(eq(householdInvitesTable.id, failedDelivery.body.data.id));
    expect(rows).toHaveLength(1);
  });

  it('resends with a rotated token and keeps cross-household invite IDs isolated', async () => {
    const first = await createAuthenticatedContext();
    const second = await createAuthenticatedContext();
    const created = await createInvite(first, 'resend@example.com');
    const firstLink = await createInviteLink(first, created.body.data.id);
    const send = vi.spyOn(mailService, 'send').mockResolvedValue({
      messageId: 'resent',
      accepted: ['resend@example.com'],
      rejected: [],
    });
    vi.spyOn(mailService, 'isConfigured').mockReturnValue(true);

    await request(app)
      .post(`/api/v1/households/${first.household.id}/invites/${created.body.data.id}/resend`)
      .set(createAuthHeaders(first.token, first.household.id))
      .expect(204);
    expect(send).toHaveBeenCalledOnce();
    const resentUrl = send.mock.calls[0]?.[0].html.match(
      /href="([^"]+\/invite\/[A-Za-z0-9_-]+)"/,
    )?.[1];
    expect(resentUrl).toBeTruthy();
    expect(tokenFromUrl(resentUrl ?? '')).not.toBe(firstLink.token);

    await request(app)
      .delete(`/api/v1/households/${second.household.id}/invites/${created.body.data.id}`)
      .set(createAuthHeaders(second.token, second.household.id))
      .expect(404);
  });
});
