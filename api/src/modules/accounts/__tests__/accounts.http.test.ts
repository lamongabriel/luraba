import request from 'supertest';
import app from '@/app';
import { createAuthHeaders, createAuthenticatedContext } from '@/test/auth';
import { buildAccountInput, createBalanceEntryForAccount, createHousehold, createHouseholdMembership } from '@/test/factories';

describe('accounts routes', () => {
  it('POST /api/v1/accounts returns 201 for a valid authenticated request', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildAccountInput({
          name: 'HTTP Checking',
          type: 'depository',
          currencyCode: 'BRL',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('HTTP Checking');
    expect(response.body.data.classification).toBe('asset');
  });

  it('POST /api/v1/accounts requires authentication', async () => {
    const response = await request(app).post('/api/v1/accounts').send(buildAccountInput());

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/accounts validates the request body', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: '',
        type: 'depository',
        currencyCode: 'BRL',
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/accounts respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });

    const response = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildAccountInput({ name: 'Viewer Attempt' }));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/accounts returns only accounts from the active household', async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: 'Second Household',
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, 'owner');

    const primaryAccountResponse = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildAccountInput({ name: 'Primary Household Account' }));

    const secondaryAccountResponse = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(context.token, secondHousehold.id))
      .send(buildAccountInput({ name: 'Secondary Household Account' }));

    await createBalanceEntryForAccount({
      householdId: context.household.id,
      accountId: primaryAccountResponse.body.data.id,
      amount: 5_500,
    });

    await createBalanceEntryForAccount({
      householdId: secondHousehold.id,
      accountId: secondaryAccountResponse.body.data.id,
      amount: 8_800,
    });

    const primaryResponse = await request(app)
      .get('/api/v1/accounts')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(primaryResponse.status).toBe(200);
    expect(primaryResponse.body.data).toHaveLength(1);
    expect(primaryResponse.body.data[0].name).toBe('Primary Household Account');
    expect(primaryResponse.body.data[0].balance).toBe(5_500);

    const secondaryResponse = await request(app)
      .get('/api/v1/accounts')
      .set(createAuthHeaders(context.token, secondHousehold.id));

    expect(secondaryResponse.status).toBe(200);
    expect(secondaryResponse.body.data).toHaveLength(1);
    expect(secondaryResponse.body.data[0].name).toBe('Secondary Household Account');
    expect(secondaryResponse.body.data[0].balance).toBe(8_800);
  });

  it('GET /api/v1/accounts/:id returns 404 for missing accounts', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get('/api/v1/accounts/1456d4ee-2f8d-4cec-92be-a780d54312c2')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/v1/accounts/:id does not leak cross-household access', async () => {
    const owner = await createAuthenticatedContext();
    const outsider = await createAuthenticatedContext();

    const created = await request(app)
      .post('/api/v1/accounts')
      .set(createAuthHeaders(owner.token, owner.household.id))
      .send(buildAccountInput({ name: 'Protected Account' }));

    const response = await request(app)
      .get(`/api/v1/accounts/${created.body.data.id}`)
      .set(createAuthHeaders(outsider.token, outsider.household.id));

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
