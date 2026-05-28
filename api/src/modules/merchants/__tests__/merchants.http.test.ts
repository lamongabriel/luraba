import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { createAuthHeaders, createAuthenticatedContext } from '@/test/auth';
import { buildMerchantInput } from '@/test/factories';
import * as brandfetchService from '@/modules/integrations/brandfetch/brandfetch.service';

describe('merchants routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/v1/merchants returns 201 for a valid authenticated request', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/merchants')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildMerchantInput({
          name: 'HTTP Merchant',
          domain: 'https://merchant.example.com',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('HTTP Merchant');
    expect(response.body.data.domain).toBe('merchant.example.com');
  });

  it('POST /api/v1/merchants derives a logo URL when Brandfetch is connected', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: 'brandfetch-client-id',
    });

    const response = await request(app)
      .post('/api/v1/merchants')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(
        buildMerchantInput({
          name: 'Logo Merchant',
          domain: 'logo.example.com',
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.data.logoUrl).toBe(
      'https://cdn.brandfetch.io/logo.example.com/icon.png?c=brandfetch-client-id',
    );
  });

  it('POST /api/v1/merchants requires authentication', async () => {
    const response = await request(app).post('/api/v1/merchants').send(buildMerchantInput());

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('POST /api/v1/merchants validates the request body', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .post('/api/v1/merchants')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({
        name: '',
      });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/v1/merchants respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });

    const response = await request(app)
      .post('/api/v1/merchants')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildMerchantInput({ name: 'Viewer Merchant' }));

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/merchants returns only merchants from the active household', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    await request(app)
      .post('/api/v1/merchants')
      .set(createAuthHeaders(context.token, context.household.id))
      .send(buildMerchantInput({ name: 'Primary Merchant' }));

    await request(app)
      .post('/api/v1/merchants')
      .set(createAuthHeaders(otherContext.token, otherContext.household.id))
      .send(buildMerchantInput({ name: 'Secondary Merchant' }));

    const primaryResponse = await request(app)
      .get('/api/v1/merchants')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(primaryResponse.status).toBe(200);
    expect(primaryResponse.body.data).toHaveLength(1);
    expect(primaryResponse.body.data[0].name).toBe('Primary Merchant');

    const secondaryResponse = await request(app)
      .get('/api/v1/merchants')
      .set(createAuthHeaders(otherContext.token, otherContext.household.id));

    expect(secondaryResponse.status).toBe(200);
    expect(secondaryResponse.body.data).toHaveLength(1);
    expect(secondaryResponse.body.data[0].name).toBe('Secondary Merchant');
  });
});
