import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from '@/app';
import { createAuthHeaders, createAuthenticatedContext } from '@/test/auth';
import { buildTagInput, createHousehold, createHouseholdMembership } from '@/test/factories';

describe('tags routes', () => {
  it('POST /api/v1/tags returns 201 for a valid request', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/tags')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildTagInput({
          name: 'Gramado Trip',
          color: '#16A34A',
          icon: 'Ticket01Icon',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Gramado Trip');
    expect(response.body.data.color).toBe('#16A34A');
    expect(response.body.data.icon).toBe('Ticket01Icon');
  });

  it('POST /api/v1/tags requires authentication', async () => {
    const response = await request(app).post('/api/v1/tags').send(buildTagInput());

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/tags validates the request body', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/tags')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ name: '' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/tags respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });

    const response = await request(app)
      .post('/api/v1/tags')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildTagInput({ name: 'Viewer Attempt' }));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/tags returns only tags from the active household', async () => {
    const context = await createAuthenticatedContext();
    const secondHousehold = await createHousehold(context.user.id, {
      name: 'Second Household',
      createdByUserId: context.user.id,
    });
    await createHouseholdMembership(secondHousehold.id, context.user.id, 'owner');

    await request(app)
      .post('/api/v1/tags')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildTagInput({ name: 'Primary Household Tag' }));

    await request(app)
      .post('/api/v1/tags')
      .set(createAuthHeaders(context.token, secondHousehold.id))
      .send(buildTagInput({ name: 'Secondary Household Tag' }));

    const primaryResponse = await request(app)
      .get('/api/v1/tags')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(primaryResponse.status).toBe(200);
    expect(primaryResponse.body.data).toHaveLength(1);
    expect(primaryResponse.body.data[0].name).toBe('Primary Household Tag');

    const secondaryResponse = await request(app)
      .get('/api/v1/tags')
      .set(createAuthHeaders(context.token, secondHousehold.id));

    expect(secondaryResponse.status).toBe(200);
    expect(secondaryResponse.body.data).toHaveLength(1);
    expect(secondaryResponse.body.data[0].name).toBe('Secondary Household Tag');
  });

  it('PATCH /api/v1/tags/:id updates a tag', async () => {
    const context = await createAuthenticatedContext();
    const created = await request(app)
      .post('/api/v1/tags')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildTagInput({ name: 'Patch Tag' }));

    const response = await request(app)
      .patch(`/api/v1/tags/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: 'Patched Tag',
        color: null,
        icon: null,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        id: created.body.data.id,
        name: 'Patched Tag',
        color: null,
        icon: null,
      }),
    );
  });

  it('DELETE /api/v1/tags/:id deletes a tag', async () => {
    const context = await createAuthenticatedContext();
    const created = await request(app)
      .post('/api/v1/tags')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildTagInput({ name: 'Delete Tag' }));

    const response = await request(app)
      .delete(`/api/v1/tags/${created.body.data.id}`)
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(204);

    const list = await request(app)
      .get('/api/v1/tags')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(list.body.data).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.data.id })]),
    );
  });
});
