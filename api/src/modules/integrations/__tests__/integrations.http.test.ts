import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '@/app';
import { createAuthHeaders, createAuthenticatedContext } from '@/test/auth';

describe('integrations routes', () => {
  it('GET /api/v1/integrations returns the active household integrations', async () => {
    const context = await createAuthenticatedContext();

    const response = await request(app)
      .get('/api/v1/integrations')
      .set(createAuthHeaders(context.token, context.household.id));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual([
      {
        provider: 'brandfetch',
        configured: false,
        status: 'not_configured',
        lastCheckedAt: null,
      },
    ]);
  });
});
