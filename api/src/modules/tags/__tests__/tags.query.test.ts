import { describe, expect, it } from 'vitest';
import { ListTagsRequestQuerySchema } from '../tags.query';

describe('tags list query', () => {
  it('parses every column filter and rejects invalid input', () => {
    const query = ListTagsRequestQuerySchema.parse({
      colors: '#16A34A',
      icons: 'Ticket01Icon',
      hasColor: 'true',
      hasIcon: 'true',
      createdAtFrom: '2025-01-01',
      createdAtTo: '2025-12-31',
      updatedAtFrom: '2025-01-01',
      updatedAtTo: '2025-12-31',
    });

    expect(query.colors).toEqual(['#16A34A']);
    expect(query.hasIcon).toBe(true);
    expect(ListTagsRequestQuerySchema.safeParse({ hasColor: '1' }).success).toBe(false);
    expect(ListTagsRequestQuerySchema.safeParse({ unknown: true }).success).toBe(false);
  });
});
