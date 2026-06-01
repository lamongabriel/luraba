import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '@/app';
import {
  createAccessTokenForUser,
  createAuthenticatedContext,
  createAuthHeaders,
} from '@/test/auth';
import { createUser } from '@/test/factories';

describe('households routes', () => {
  it('GET /api/v1/households returns the authenticated user households', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get('/api/v1/households')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(context.household.id);
  });

  it('POST /api/v1/households returns 201 for a valid payload', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/households')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: 'HTTP Household',
        defaultCurrencyId: 'USD',
        countryCode: 'US',
        timezone: 'UTC',
        budgetMonthStartsOn: 4,
        creditExpenseTiming: 'payment_month',
        creditInstallmentBudgetMode: 'full_amount',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('HTTP Household');
    expect(response.body.data.defaultCurrencyId).toBe('USD');
  });

  it('PATCH /api/v1/households/:id respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });

    const response = await request(app)
      .patch(`/api/v1/households/${context.household.id}`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ name: 'Blocked' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/households/:id/members returns members for the active household', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get(`/api/v1/households/${context.household.id}/members`)
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0].userId).toBe(context.user.id);
  });

  it('POST /api/v1/households/:id/invites creates a pending invite', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post(`/api/v1/households/${context.household.id}/invites`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        email: 'new-member@example.com',
        role: 'member',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.email).toBe('new-member@example.com');
    expect(response.body.data.status).toBe('pending');
  });

  it('POST /api/v1/households/invites/:id/accept returns 204 for the invited user', async () => {
    const owner = await createAuthenticatedContext();
    const invitedUser = await createUser({ email: 'household-http-invite@example.com' });
    const invitedToken = createAccessTokenForUser(invitedUser);

    const createdInvite = await request(app)
      .post(`/api/v1/households/${owner.household.id}/invites`)
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send({
        email: invitedUser.email,
        role: 'member',
      });

    const response = await request(app)
      .post(`/api/v1/households/invites/${createdInvite.body.data.id}/accept`)
      .set(createAuthHeaders(invitedToken));

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
  });
});
