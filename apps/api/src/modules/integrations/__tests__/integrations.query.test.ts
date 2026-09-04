import { listIntegrationsQuerySchema } from '@luraba/contracts/integrations';
import { describe, expect, it } from 'vitest';

describe('integrations list query', () => {
  it('parses every column filter and rejects invalid input', () => {
    const query = listIntegrationsQuerySchema.parse({
      providers: 'brandfetch',
      statuses: 'connected,not_configured',
      configured: 'false',
      lastCheckedAtFrom: '2025-01-01T00:00:00.000Z',
      lastCheckedAtTo: '2025-12-31T23:59:59.999Z',
    });

    expect(query.providers).toEqual(['brandfetch']);
    expect(query.configured).toBe(false);
    expect(listIntegrationsQuerySchema.safeParse({ configured: 'no' }).success).toBe(false);
    expect(
      listIntegrationsQuerySchema.safeParse({
        lastCheckedAtFrom: '2026-01-01',
        lastCheckedAtTo: '2025-01-01',
      }).success,
    ).toBe(false);
  });
});
