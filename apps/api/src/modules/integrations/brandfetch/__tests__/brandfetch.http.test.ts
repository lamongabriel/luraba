import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import app from '@/app';
import { createAuthenticatedContext, createAuthHeaders } from '@/test/auth';

describe('brandfetch integration routes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('PUT /api/v1/integrations/brandfetch connects Brandfetch for the active household', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    const response = await request(app)
      .put('/api/v1/integrations/brandfetch')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ clientId: 'brandfetch-client-id' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      provider: 'brandfetch',
      configured: true,
      status: 'connected',
    });
    expect(response.body.data.clientId).toBeUndefined();
  });

  it('PUT /api/v1/integrations/brandfetch validates the payload', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .put('/api/v1/integrations/brandfetch')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ clientId: '' });

    expect(response.status).toBe(422);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('PUT /api/v1/integrations/brandfetch respects household permissions', async () => {
    const context = await createAuthenticatedContext({ role: 'viewer' });
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    const response = await request(app)
      .put('/api/v1/integrations/brandfetch')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ clientId: 'brandfetch-client-id' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  it('DELETE /api/v1/integrations/brandfetch disconnects Brandfetch', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await request(app)
      .put('/api/v1/integrations/brandfetch')
      .set(createAuthHeaders(context.token, context.household.id))
      .send({ clientId: 'brandfetch-client-id' });

    const response = await request(app)
      .delete('/api/v1/integrations/brandfetch')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual({
      provider: 'brandfetch',
      configured: false,
      status: 'not_configured',
      lastCheckedAt: null,
    });
  });
});
