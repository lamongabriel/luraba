import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '@/app';
import { createAuthHeaders, createAuthenticatedContext } from '@/test/auth';
import { buildCategoryInput, createHousehold, createHouseholdMembership } from '@/test/factories';

describe('categories routes', () => {
  it('POST /api/v1/categories returns 201 for a valid request', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/categories')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildCategoryInput({
          name: 'HTTP Category',
          color: '#F97316',
          icon: 'Wallet02Icon',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('HTTP Category');
    expect(response.body.data.color).toBe('#F97316');
    expect(response.body.data.icon).toBe('Wallet02Icon');
  });

  it('POST /api/v1/categories requires authentication', async () => {
    const response = await request(app).post('/api/v1/categories').send(buildCategoryInput());

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/categories validates the request body', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/categories')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: '',
        type: 'expense',
        color: 'blue',
        icon: 'bad icon',
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/categories respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });

    const response = await request(app)
      .post('/api/v1/categories')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildCategoryInput({ name: 'Viewer Attempt' }));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/categories returns only categories from the active household', async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: 'Second Household',
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, 'owner');

    await request(app)
      .post('/api/v1/categories')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildCategoryInput({ name: 'Primary Household Category' }));

    await request(app)
      .post('/api/v1/categories')
      .set(createAuthHeaders(context.token, secondHousehold.id))
      .send(buildCategoryInput({ name: 'Secondary Household Category' }));

    const primaryResponse = await request(app)
      .get('/api/v1/categories')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(primaryResponse.status).toBe(200);
    expect(primaryResponse.body.data).toHaveLength(1);
    expect(primaryResponse.body.data[0].name).toBe('Primary Household Category');

    const secondaryResponse = await request(app)
      .get('/api/v1/categories')
      .set(createAuthHeaders(context.token, secondHousehold.id));

    expect(secondaryResponse.status).toBe(200);
    expect(secondaryResponse.body.data).toHaveLength(1);
    expect(secondaryResponse.body.data[0].name).toBe('Secondary Household Category');
  });
});
