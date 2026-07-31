import { describe, expect, it } from 'vitest';
import { ListMerchantsRequestQuerySchema } from '../merchants.query';

describe('merchants list query', () => {
  it('parses every column filter and rejects invalid input', () => {
    const query = ListMerchantsRequestQuerySchema.parse({
      hasDomain: 'true',
      hasLogo: 'false',
      createdAtFrom: '2025-01-01',
      createdAtTo: '2025-12-31',
      updatedAtFrom: '2025-01-01',
      updatedAtTo: '2025-12-31',
    });

    expect(query).toMatchObject({ hasDomain: true, hasLogo: false });
    expect(ListMerchantsRequestQuerySchema.safeParse({ hasLogo: 'sometimes' }).success).toBe(false);
    expect(ListMerchantsRequestQuerySchema.safeParse({ extra: true }).success).toBe(false);
  });
});
