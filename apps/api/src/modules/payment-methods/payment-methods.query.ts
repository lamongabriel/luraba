import type { listPaymentMethodsQuerySchema } from '@luraba/contracts/payment-methods';
import { eq, isNull, or, type SQL, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { paymentMethodsTable } from '@/db/schemas/payment-methods.schema';
import {
  buildIlikeSearch,
  buildOrderBy,
  combineConditions,
  inArrayIfAny,
  nullabilityCondition,
  rangeConditions,
} from '@/shared/list';

export type ListPaymentMethodsQuery = z.output<typeof listPaymentMethodsQuerySchema>;

export const paymentMethodScopeExpression = sql`
  case when ${paymentMethodsTable.householdId} is null then 'system' else 'household' end
`;

export function buildPaymentMethodsListWhere(
  householdId: string,
  query: ListPaymentMethodsQuery,
): SQL {
  return combineConditions(
    or(isNull(paymentMethodsTable.householdId), eq(paymentMethodsTable.householdId, householdId)),
    query.currencyCode
      ? or(
          isNull(paymentMethodsTable.currencyId),
          eq(paymentMethodsTable.currencyId, query.currencyCode),
        )
      : undefined,
    buildIlikeSearch(query.search, [
      sql`${paymentMethodsTable.name}`,
      sql`${paymentMethodsTable.code}`,
      sql`${paymentMethodsTable.currencyId}`,
      paymentMethodScopeExpression,
    ]),
    inArrayIfAny(paymentMethodsTable.code, query.codes),
    inArrayIfAny(paymentMethodScopeExpression, query.scopes),
    nullabilityCondition(paymentMethodsTable.currencyId, query.hasCurrency),
    ...rangeConditions(paymentMethodsTable.createdAt, query.createdAtFrom, query.createdAtTo),
    ...rangeConditions(paymentMethodsTable.updatedAt, query.updatedAtFrom, query.updatedAtTo),
  ) as SQL;
}

export function buildPaymentMethodsListOrder(query: ListPaymentMethodsQuery): SQL[] {
  return buildOrderBy(
    query,
    {
      code: sql`${paymentMethodsTable.code}`,
      createdAt: sql`${paymentMethodsTable.createdAt}`,
      currencyCode: sql`${paymentMethodsTable.currencyId}`,
      name: sql`${paymentMethodsTable.name}`,
      scope: paymentMethodScopeExpression,
      updatedAt: sql`${paymentMethodsTable.updatedAt}`,
    },
    [
      sql`${paymentMethodsTable.name} asc`,
      sql`${paymentMethodsTable.code} asc`,
      sql`${paymentMethodsTable.currencyId} asc`,
      sql`${paymentMethodsTable.id} asc`,
    ],
  );
}
