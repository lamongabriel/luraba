import { afterEach, describe, expect, it, vi } from 'vitest';
import { brandfetchIntegrationsTable } from '@/db/schemas/brandfetch-integrations.schema';
import { ConflictError } from '@/shared/errors';
import { db } from '@/db';
import { createAuthenticatedContext } from '@/test/auth';
import { buildMerchantInput } from '@/test/factories';
import * as brandfetchService from '@/modules/integrations/brandfetch/brandfetch.service';
import * as merchantsService from '../merchants.service';

describe('merchants service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a merchant in the active household without a logo when Brandfetch is not configured', async () => {
    const context = await createAuthenticatedContext();

    const merchant = await merchantsService.createMerchant(
      context.householdContext,
      buildMerchantInput({
        name: 'Padaria Central',
        domain: 'https://padaria.example.com',
      }),
    );

    expect(merchant.name).toBe('Padaria Central');
    expect(merchant.domain).toBe('padaria.example.com');
    expect(merchant.logoUrl).toBeNull();
  });

  it('creates a merchant with a Brandfetch logo when the integration is configured', async () => {
    const context = await createAuthenticatedContext();
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('ok', { status: 200 }));

    await brandfetchService.updateBrandfetchIntegration(context.householdContext, {
      clientId: 'brandfetch-client-id',
    });

    const merchant = await merchantsService.createMerchant(
      context.householdContext,
      buildMerchantInput({
        name: 'Brandfetch Merchant',
        domain: 'https://www.brandfetch.example.com/store',
      }),
    );

    expect(merchant.domain).toBe('brandfetch.example.com');
    expect(merchant.logoUrl).toBe(
      'https://cdn.brandfetch.io/brandfetch.example.com/icon.png?c=brandfetch-client-id',
    );

    const rows = await db.select().from(brandfetchIntegrationsTable);
    expect(rows[0]?.encryptedClientId).not.toContain('brandfetch-client-id');
  });

  it('rejects duplicate merchant names in the same household', async () => {
    const context = await createAuthenticatedContext();
    const input = buildMerchantInput({ name: 'Coffee Shop' });

    await merchantsService.createMerchant(context.householdContext, input);

    await expect(merchantsService.createMerchant(context.householdContext, input)).rejects.toThrow(ConflictError);
  });

  it('allows the same merchant name in different households', async () => {
    const left = await createAuthenticatedContext();
    const right = await createAuthenticatedContext();
    const input = buildMerchantInput({ name: 'Marketplace' });

    const leftMerchant = await merchantsService.createMerchant(left.householdContext, input);
    const rightMerchant = await merchantsService.createMerchant(right.householdContext, input);

    expect(leftMerchant.id).not.toBe(rightMerchant.id);
    expect(leftMerchant.name).toBe(rightMerchant.name);
  });

  it('lists only merchants from the active household', async () => {
    const context = await createAuthenticatedContext();
    const otherContext = await createAuthenticatedContext();

    await merchantsService.createMerchant(
      context.householdContext,
      buildMerchantInput({ name: 'Household Merchant' }),
    );

    await merchantsService.createMerchant(
      otherContext.householdContext,
      buildMerchantInput({ name: 'Other Household Merchant' }),
    );

    const merchants = await merchantsService.listMerchants(context.householdContext);

    expect(merchants).toHaveLength(1);
    expect(merchants[0]?.name).toBe('Household Merchant');
  });
});
