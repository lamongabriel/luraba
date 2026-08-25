import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/db';
import { brandfetchIntegrationsTable } from '@/db/schemas/brandfetch-integrations.schema';
import { ValidationError } from '@/shared/errors';
import { createAuthenticatedContext } from '@/test/auth';
import * as brandfetchService from '../brandfetch.service';

describe('brandfetch integration service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores Brandfetch credentials encrypted and returns a safe summary', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    const summary = await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: 'brandfetch-client-id',
    });

    expect(summary).toMatchObject({
      provider: 'brandfetch',
      configured: true,
      status: 'connected',
    });
    expect(summary.lastCheckedAt).toBeTruthy();

    const rows = await db
      .select()
      .from(brandfetchIntegrationsTable)
      .where(eq(brandfetchIntegrationsTable.householdId, context.household.id));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.encryptedClientId).not.toBe('brandfetch-client-id');

    const clientId = await brandfetchService.getBrandfetchClientId(context.householdContext);
    expect(clientId).toBe('brandfetch-client-id');
  });

  it('rejects invalid Brandfetch client ids', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('forbidden', { status: 403 }));

    await expect(
      brandfetchService.updateBrandfetchIntegration(context.householdContext, {
        clientId: 'bad-client-id',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('deletes Brandfetch integrations cleanly', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: 'brandfetch-client-id',
    });

    const deleted = await brandfetchService.deleteBrandfetchIntegration(context.householdContext);
    expect(deleted).toEqual({
      provider: 'brandfetch',
      configured: false,
      status: 'not_configured',
      lastCheckedAt: null,
    });
  });
});
