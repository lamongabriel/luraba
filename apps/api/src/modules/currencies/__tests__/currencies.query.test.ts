import { describe, expect, it } from 'vitest';
import { ListCurrenciesRequestQuerySchema } from '../currencies.query';

describe('currencies list query', () => {
  it('parses column filters and rejects invalid input', () => {
    const query = ListCurrenciesRequestQuerySchema.parse({
      codes: 'brl,usd',
      precisions: '0,2',
    });

    expect(query.codes).toEqual(['BRL', 'USD']);
    expect(query.precisions).toEqual([0, 2]);
    expect(ListCurrenciesRequestQuerySchema.safeParse({ precisions: 9 }).success).toBe(false);
    expect(ListCurrenciesRequestQuerySchema.safeParse({ unknown: true }).success).toBe(false);
  });
});
