import request from 'supertest';
import app from '@/app';
import { createAuthHeaders, createAuthenticatedContext } from '@/test/auth';
import { buildRegisterInput, createHousehold, createHouseholdMembership } from '@/test/factories';
import * as authService from '../auth.service';

describe('auth routes', () => {
  it('POST /api/v1/auth/register returns 201 and the session payload', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(
        buildRegisterInput({
          name: 'Route Register',
          email: 'route-register@example.com',
          preferences: {
            currency: 'USD',
          },
          household: {
            name: 'Route Household',
            settings: {
              defaultCurrencyId: 'USD',
            },
          },
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.user.email).toBe('route-register@example.com');
    expect(response.body.data.household.name).toBe('Route Household');
    expect(response.body.data.household.settings.defaultCurrencyId).toBe('USD');
  });

  it('POST /api/v1/auth/register validates the payload', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      name: '',
      email: 'invalid@example.com',
      password: 'short',
      preferences: {},
      household: { settings: {} },
    });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/auth/login returns a session for valid credentials', async () => {
    const input = buildRegisterInput({
      email: 'route-login@example.com',
      password: '123123123',
    });
    await authService.register(input);

    const response = await request(app).post('/api/v1/auth/login').send({
      email: input.email,
      password: input.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.user.email).toBe(input.email);
  });

  it('POST /api/v1/auth/login rejects invalid credentials', async () => {
    const input = buildRegisterInput({
      email: 'route-bad-login@example.com',
      password: '123123123',
    });
    await authService.register(input);

    const response = await request(app).post('/api/v1/auth/login').send({
      email: input.email,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me requires authentication', async () => {
    const response = await request(app).get('/api/v1/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me returns the selected active household', async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: 'Secondary Household',
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, 'admin');

    const response = await request(app)
      .get('/api/v1/auth/me')
      .set(createAuthHeaders(context.token, secondHousehold.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.id).toBe(context.user.id);
    expect(response.body.data.household.id).toBe(secondHousehold.id);
    expect(response.body.data.household.name).toBe('Secondary Household');
    expect(response.body.data.household.role).toBe('admin');
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
