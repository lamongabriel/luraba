import { listCategoriesQuerySchema } from '@luraba/contracts/categories';
import { describe, expect, it } from 'vitest';

describe('categories list query', () => {
  it('parses every column filter and rejects invalid input', () => {
    const query = listCategoriesQuerySchema.parse({
      types: 'expense,income',
      parentIds: '1456d4ee-2f8d-4cec-92be-a780d54312c2',
      hasParent: 'true',
      colors: '#10B981',
      icons: 'AppleIcon',
      createdAtFrom: '2025-01-01',
      createdAtTo: '2025-12-31',
      updatedAtFrom: '2025-01-01',
      updatedAtTo: '2025-12-31',
    });

    expect(query.types).toEqual(['expense', 'income']);
    expect(query.hasParent).toBe(true);
    expect(listCategoriesQuerySchema.safeParse({ hasParent: 'yes' }).success).toBe(false);
    expect(
      listCategoriesQuerySchema.safeParse({
        createdAtFrom: '2026-01-01',
        createdAtTo: '2025-01-01',
      }).success,
    ).toBe(false);
  });
});
