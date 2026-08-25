import { type SQL, sql } from 'drizzle-orm';
import { z } from 'zod';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  commaSeparatedArraySchema,
  createListQuerySchema,
  inArrayIfAny,
} from '@/shared/list';
import { currencySchema } from '@/shared/validation/preferences';

export const ListCurrenciesRequestQuerySchema = createListQuerySchema(
  {
    codes: commaSeparatedArraySchema(currencySchema),
    precisions: commaSeparatedArraySchema(z.coerce.number().int().min(0).max(8)),
  },
  ['code', 'symbol', 'precision'],
);

export type ListCurrenciesRequestQuery = z.infer<typeof ListCurrenciesRequestQuerySchema>;

export function buildCurrenciesListWhere(query: ListCurrenciesRequestQuery): SQL | undefined {
  return combineConditions(
    buildIlikeSearch(query.search, [sql`${currenciesTable.code}`, sql`${currenciesTable.symbol}`]),
    inArrayIfAny(currenciesTable.code, query.codes),
    inArrayIfAny(currenciesTable.precision, query.precisions),
  );
}

export function buildCurrenciesListOrder(query: ListCurrenciesRequestQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      code: sql`${currenciesTable.code}`,
      precision: sql`${currenciesTable.precision}`,
      symbol: sql`${currenciesTable.symbol}`,
    },
    [sql`${currenciesTable.code} asc`],
  );
}
