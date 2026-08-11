import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import app from '@/app';
import { db } from '@/db';
import { householdInvitesTable, householdMembersTable } from '@/db/schemas/households.schema';
import { usersTable } from '@/db/schemas/users.schema';
import { createAuthenticatedContext, createAuthHeaders } from '@/test/auth';
import { createHousehold, createHouseholdMembership } from '@/test/factories';

describe('auth routes', () => {
  function invitationTokenFromUrl(url: string): string {
    const token = new URL(url).pathname.split('/').at(-1);
    if (!token) throw new Error('Invitation URL does not contain a token');
    return token;
  }

  it('GET /api/v1/auth/providers returns enabled auth providers', async () => {
    const response = await request(app).get('/api/v1/auth/providers');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        emailPassword: true,
        socialProviders: {
          google: false,
          github: false,
        },
      },
    });
  });

  it('GET /api/auth/ok confirms Better Auth is mounted', async () => {
    const response = await request(app).get('/api/auth/ok');

    expect(response.status).toBe(200);
  });

  it('does not expose Better Auth organization HTTP routes', async () => {
    const context = await createAuthenticatedContext();
    const response = await request(app)
      .get('/api/auth/organization/list')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(404);
  });

  it('POST /api/auth/sign-up/email creates a session cookie and default household', async () => {
    const agent = request.agent(app);

    const signUpResponse = await agent.post('/api/auth/sign-up/email').send({
      name: 'Route Register',
      email: 'route-register@example.com',
      password: '123123123',
    });

    expect(signUpResponse.status).toBe(200);
    expect(signUpResponse.headers['set-cookie']).toBeTruthy();
    expect(signUpResponse.body.user.email).toBe('route-register@example.com');
    expect(signUpResponse.body.user.defaultHouseholdId).toBeTruthy();
    expect(signUpResponse.body.household.role).toBe('owner');
    expect(signUpResponse.body.household.id).toBe(signUpResponse.body.user.defaultHouseholdId);

    const meResponse = await agent.get('/api/v1/auth/me');

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data.user.email).toBe('route-register@example.com');
    expect(meResponse.body.data.user.defaultHouseholdId).toBe(meResponse.body.data.household.id);
    expect(meResponse.body.data.household.role).toBe('owner');
  });

  it('keeps sign-up timezones at the API default until validated preferences are updated', async () => {
    const agent = request.agent(app);

    const signUpResponse = await agent.post('/api/auth/sign-up/email').send({
      name: 'Timezone Register',
      email: 'timezone-register@example.com',
      password: '123123123',
      preferredTimezone: 'Invalid/Timezone',
    });

    expect(signUpResponse.status).toBe(200);

    const preferencesResponse = await agent.get('/api/v1/auth/me/preferences');

    expect(preferencesResponse.status).toBe(200);
    expect(preferencesResponse.body.data.timezone).toBe('America/Sao_Paulo');
  });

  it('invite signup defers the personal household until token acceptance', async () => {
    const owner = await createAuthenticatedContext();
    const email = 'explicit-household-acceptance@example.com';
    const inviteResponse = await request(app)
      .post(`/api/v1/households/${owner.household.id}/invites`)
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send({ email, role: 'member' });

    expect(inviteResponse.status).toBe(201);

    const linkResponse = await request(app)
      .post(`/api/v1/households/${owner.household.id}/invites/${inviteResponse.body.data.id}/link`)
      .set(createAuthHeaders(owner.token, owner.household.id));
    expect(linkResponse.status).toBe(200);
    const token = invitationTokenFromUrl(linkResponse.body.data.url);

    const agent = request.agent(app);
    const signUpResponse = await agent.post('/api/auth/sign-up/email').send({
      name: 'Explicit Invite User',
      email,
      password: '123123123',
    });

    expect(signUpResponse.status).toBe(200);

    const userRows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    const user = userRows[0];
    expect(user).toBeTruthy();

    const [inviteRows, membershipRows] = await Promise.all([
      db
        .select()
        .from(householdInvitesTable)
        .where(eq(householdInvitesTable.id, inviteResponse.body.data.id)),
      db.select().from(householdMembersTable).where(eq(householdMembersTable.userId, user.id)),
    ]);

    expect(inviteRows[0]?.status).toBe('pending');
    expect(membershipRows).toHaveLength(0);
    expect(signUpResponse.body.household).toBeNull();
    expect(user.defaultHouseholdId).toBeNull();

    const accepted = await agent.post('/api/v1/households/invites/accept').send({ token });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.household.id).toBe(owner.household.id);

    const [acceptedInviteRows, acceptedMembershipRows, acceptedUserRows] = await Promise.all([
      db
        .select()
        .from(householdInvitesTable)
        .where(eq(householdInvitesTable.id, inviteResponse.body.data.id)),
      db
        .select()
        .from(householdMembersTable)
        .where(
          and(
            eq(householdMembersTable.householdId, owner.household.id),
            eq(householdMembersTable.userId, user.id),
          ),
        ),
      db.select().from(usersTable).where(eq(usersTable.id, user.id)),
    ]);

    expect(acceptedInviteRows[0]?.status).toBe('accepted');
    expect(acceptedMembershipRows).toHaveLength(1);
    expect(acceptedUserRows[0]).toMatchObject({
      defaultHouseholdId: owner.household.id,
      emailVerified: true,
    });

    const meResponse = await agent.get('/api/v1/auth/me');
    expect(meResponse.status).toBe(200);
    expect(meResponse.body.data.household.id).toBe(owner.household.id);
  });

  it('POST /api/auth/sign-in/email creates a cookie session that protected routes accept', async () => {
    await request(app).post('/api/auth/sign-up/email').send({
      name: 'Route Login',
      email: 'route-login@example.com',
      password: '123123123',
    });

    const agent = request.agent(app);
    const signInResponse = await agent.post('/api/auth/sign-in/email').send({
      email: 'route-login@example.com',
      password: '123123123',
    });

    expect(signInResponse.status).toBe(200);
    expect(signInResponse.headers['set-cookie']).toBeTruthy();
    expect(signInResponse.body.household.role).toBe('owner');
    expect(signInResponse.body.user.defaultHouseholdId).toBe(signInResponse.body.household.id);

    const meResponse = await agent.get('/api/v1/auth/me');

    expect(meResponse.status).toBe(200);
    expect(meResponse.body.success).toBe(true);
    expect(meResponse.body.data.user.email).toBe('route-login@example.com');
  });

  it('POST /api/auth/sign-up/email returns the standard API error shape for duplicate emails', async () => {
    await request(app).post('/api/auth/sign-up/email').send({
      name: 'First User',
      email: 'duplicate-sign-up@example.com',
      password: '123123123',
    });

    const duplicateResponse = await request(app).post('/api/auth/sign-up/email').send({
      name: 'Second User',
      email: 'duplicate-sign-up@example.com',
      password: '123123123',
    });

    expect(duplicateResponse.status).toBe(422);
    expect(duplicateResponse.body).toEqual({
      code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      message: 'User already exists. Use another email.',
    });
  });

  it('POST /api/auth/sign-in/email returns the standard API error shape for invalid credentials', async () => {
    await request(app).post('/api/auth/sign-up/email').send({
      name: 'Wrong Password User',
      email: 'wrong-password@example.com',
      password: '123123123',
    });

    const signInResponse = await request(app).post('/api/auth/sign-in/email').send({
      email: 'wrong-password@example.com',
      password: 'wrong-password',
    });

    expect(signInResponse.status).toBe(401);
    expect(signInResponse.body).toEqual({
      code: 'INVALID_EMAIL_OR_PASSWORD',
      message: 'Invalid email or password',
    });
  });

  it('POST /api/auth/sign-out clears access to protected routes', async () => {
    const agent = request.agent(app);

    await agent.post('/api/auth/sign-up/email').send({
      name: 'Route Signout',
      email: 'route-signout@example.com',
      password: '123123123',
    });

    const beforeSignOut = await agent.get('/api/v1/auth/me');
    expect(beforeSignOut.status).toBe(200);

    const signOutResponse = await agent.post('/api/auth/sign-out');
    expect(signOutResponse.status).toBe(200);

    const afterSignOut = await agent.get('/api/v1/auth/me');
    expect(afterSignOut.status).toBe(401);
  });

  it('GET /api/v1/auth/me requires authentication', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me returns the household selected by header', async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: 'Secondary Household',
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, 'admin');

    const defaultResponse = await request(app)
      .get('/api/v1/auth/me')
      .set(createAuthHeaders(context.token));

    expect(defaultResponse.status).toBe(200);
    expect(defaultResponse.body.data.household.id).toBe(context.household.id);

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set(createAuthHeaders(context.token, secondHousehold.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.id).toBe(context.user.id);
    expect(response.body.data.household.id).toBe(secondHousehold.id);
    expect(response.body.data.household.name).toBe('Secondary Household');
    expect(response.body.data.household.role).toBe('admin');

    await expect
      .poll(async () => {
        const rows = await db
          .select({ lastActiveAt: usersTable.lastActiveAt })
          .from(usersTable)
          .where(eq(usersTable.id, context.user.id));
        return rows[0]?.lastActiveAt ?? null;
      })
      .not.toBeNull();
  });

  it('GET /api/v1/auth/me/preferences returns persisted preferences', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get('/api/v1/auth/me/preferences')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.currency).toBe('BRL');
    expect(response.body.data.preferredTheme).toBe('system');
  });

  it('PATCH /api/v1/auth/me/preferences updates preferences', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .patch('/api/v1/auth/me/preferences')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        currency: 'USD',
        preferredTheme: 'dark',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.currency).toBe('USD');
    expect(response.body.data.preferredTheme).toBe('dark');
  });
});
