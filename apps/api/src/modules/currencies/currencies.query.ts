import type { listCurrenciesQuerySchema } from '@luraba/contracts/currencies';
import { type SQL, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { buildIlikeSearch, buildOrderBy, combineConditions, inArrayIfAny } from '@/shared/list';

export type ListCurrenciesQuery = z.output<typeof listCurrenciesQuerySchema>;

export function buildCurrenciesListWhere(query: ListCurrenciesQuery): SQL | undefined {
  return combineConditions(
    buildIlikeSearch(query.search, [sql`${currenciesTable.code}`, sql`${currenciesTable.symbol}`]),
    inArrayIfAny(currenciesTable.code, query.codes),
    inArrayIfAny(currenciesTable.precision, query.precisions),
  );
}

export function buildCurrenciesListOrder(query: ListCurrenciesQuery): SQL[] {
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
