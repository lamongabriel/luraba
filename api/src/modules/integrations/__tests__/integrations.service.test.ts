import { describe, expect, it } from 'vitest';
import { createAuthenticatedContext } from '@/test/auth';
import * as integrationsService from '../integrations.service';

describe('integrations service', () => {
  it('lists household integrations without leaking credentials', async () => {
    const context = await createAuthenticatedContext();

    const listed = await integrationsService.listIntegrations(context.householdContext);
    expect(listed).toEqual([
      {
        provider: 'brandfetch',
        configured: false,
        status: 'not_configured',
        lastCheckedAt: null,
      },
    ]);
    expect((listed[0] as Record<string, unknown>).clientId).toBeUndefined();
  });
});
