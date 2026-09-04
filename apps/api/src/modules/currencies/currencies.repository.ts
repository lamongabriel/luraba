import type { Currency } from '@luraba/contracts/currencies';
import { asc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { currenciesTable } from '@/db/schemas/currencies.schema';
import { type DbListPage, getPagination } from '@/shared/list';
import {
  buildCurrenciesListOrder,
  buildCurrenciesListWhere,
  type ListCurrenciesQuery,
} from './currencies.query';

class CurrenciesRepository {
  async list(): Promise<Currency[]> {
    return db
      .select({
        code: currenciesTable.code,
        symbol: currenciesTable.symbol,
        precision: currenciesTable.precision,
      })
      .from(currenciesTable)
      .orderBy(asc(currenciesTable.code));
  }

  async listPage(query: ListCurrenciesQuery): Promise<DbListPage<Currency>> {
    const where = buildCurrenciesListWhere(query);
    const orderBy = buildCurrenciesListOrder(query);
    const { limit, offset } = getPagination(query);
    const [countRow, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::integer` }).from(currenciesTable).where(where),
      db
        .select({
          code: currenciesTable.code,
          symbol: currenciesTable.symbol,
          precision: currenciesTable.precision,
        })
        .from(currenciesTable)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
    ]);

    return {
      rows,
      totalCount: countRow[0]?.count ?? 0,
    };
  }

  async findByCode(currencyCode: string): Promise<Currency | undefined> {
    const rows = await db
      .select({
        code: currenciesTable.code,
        symbol: currenciesTable.symbol,
        precision: currenciesTable.precision,
      })
      .from(currenciesTable)
      .where(eq(currenciesTable.code, currencyCode))
      .limit(1);

    return rows[0];
  }

  async listPrecisions(currencyCodes: string[]): Promise<Record<string, number>> {
    if (currencyCodes.length === 0) {
      return {};
    }

    const rows = await db
      .select({
        code: currenciesTable.code,
        precision: currenciesTable.precision,
      })
      .from(currenciesTable)
      .where(inArray(currenciesTable.code, currencyCodes));

    return Object.fromEntries(rows.map((row) => [row.code, row.precision]));
  }
}

export const currenciesRepository = new CurrenciesRepository();
